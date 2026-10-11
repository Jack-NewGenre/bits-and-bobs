"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Canvas, Point, type TMat2D } from "fabric";

import type { EditorDocument } from "@/lib/image/editor/document";
import {
  centredTransform,
  clampZoom,
  fitZoom,
  stepZoom,
  visibleArea,
  type Insets,
} from "@/lib/image/editor/viewport";
import { handlesOwnKeys } from "@/lib/image/editor/shortcuts";

/** Where the document sits on screen, used to lay the checkerboard under it. */
export interface Artboard {
  left: number;
  top: number;
  width: number;
  height: number;
  zoom: number;
}

/**
 * Owns the Fabric canvas: creates it inside `hostRef`, keeps it the size of
 * its box, and handles zooming (pinch or ctrl + wheel) and panning (wheel,
 * the hand tool or holding space).
 */
export function useEditorViewport(
  hostRef: RefObject<HTMLDivElement | null>,
  backdropRef: RefObject<HTMLDivElement | null>,
  doc: EditorDocument | null,
  panMode: boolean,
  fitInsets: Insets,
) {
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [artboard, setArtboard] = useState<Artboard | null>(null);
  const docRef = useRef(doc);
  const panModeRef = useRef(panMode);
  const insetsRef = useRef(fitInsets);
  const spaceRef = useRef(false);
  const panning = useRef(false);
  const hasDoc = doc !== null;

  useEffect(() => {
    docRef.current = doc;
    panModeRef.current = panMode;
    insetsRef.current = fitInsets;
  });

  const sync = useCallback((target: Canvas) => {
    const current = docRef.current;
    if (!current) return;
    const [zoom, , , , x, y] = target.viewportTransform;
    setArtboard({
      left: x,
      top: y,
      width: current.width * zoom,
      height: current.height * zoom,
      zoom,
    });
    target.requestRenderAll();
  }, []);

  const setViewport = useCallback(
    (transform: TMat2D) => {
      if (!canvas) return;
      canvas.setViewportTransform(transform);
      sync(canvas);
    },
    [canvas, sync],
  );

  /** Pass the document when it has only just changed and not yet rendered. */
  const zoomFit = useCallback(
    (target?: EditorDocument) => {
      const current = target ?? docRef.current;
      if (!canvas || !current) return;
      const insets = insetsRef.current;
      const area = visibleArea(canvas.width, canvas.height, insets);
      const zoom = fitZoom(
        current.width,
        current.height,
        area.width,
        area.height,
      );
      setViewport(
        centredTransform(
          zoom,
          current.width,
          current.height,
          canvas.width,
          canvas.height,
          insets,
        ),
      );
    },
    [canvas, setViewport],
  );

  const zoomTo = useCallback(
    (zoom: number) => {
      const current = docRef.current;
      if (!canvas || !current) return;
      setViewport(
        centredTransform(
          clampZoom(zoom),
          current.width,
          current.height,
          canvas.width,
          canvas.height,
          insetsRef.current,
        ),
      );
    },
    [canvas, setViewport],
  );

  const zoomStep = useCallback(
    (direction: 1 | -1) => {
      if (!canvas) return;
      const centre = new Point(canvas.width / 2, canvas.height / 2);
      canvas.zoomToPoint(centre, stepZoom(canvas.getZoom(), direction));
      sync(canvas);
    },
    [canvas, sync],
  );

  // A document resize (or an undo across one) moves the artboard.
  useEffect(() => {
    if (canvas) sync(canvas);
  }, [canvas, doc, sync]);

  // Create the canvas once a document exists. The element is made here rather
  // than rendered by React because Fabric wraps it in markup of its own.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !hasDoc) return;
    const element = document.createElement("canvas");
    host.appendChild(element);
    const created = new Canvas(element, {
      width: host.clientWidth,
      height: host.clientHeight,
      preserveObjectStacking: true,
      stopContextMenu: true,
      fireMiddleClick: true,
    });
    setCanvas(created);

    const observer = new ResizeObserver(() => {
      created.setDimensions({
        width: host.clientWidth,
        height: host.clientHeight,
      });
      sync(created);
    });
    observer.observe(host);

    return () => {
      observer.disconnect();
      setCanvas(null);
      void created.dispose();
      host.replaceChildren();
    };
  }, [hostRef, hasDoc, sync]);

  // The backdrop (checkerboard and shadow) is placed inside Fabric's own render
  // rather than through React state, so it never trails the canvas mid-pan.
  useEffect(() => {
    if (!canvas) return;
    const place = () => {
      const element = backdropRef.current;
      const current = docRef.current;
      if (!element || !current) return;
      const [zoom, , , , x, y] = canvas.viewportTransform;
      Object.assign(element.style, {
        left: `${x}px`,
        top: `${y}px`,
        width: `${current.width * zoom}px`,
        height: `${current.height * zoom}px`,
      });
    };
    place();
    return canvas.on("after:render", place);
  }, [canvas, backdropRef]);

  // Wheel pans, pinch or ctrl + wheel zooms towards the pointer.
  useEffect(() => {
    if (!canvas) return;
    let last: { x: number; y: number } | null = null;
    // What the active tool had set, handed back once the pan ends.
    let saved = { skipTargetFind: false, selection: true };

    const offWheel = canvas.on("mouse:wheel", ({ e }) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const zoom = clampZoom(canvas.getZoom() * 0.99 ** e.deltaY);
        canvas.zoomToPoint(new Point(e.offsetX, e.offsetY), zoom);
      } else {
        canvas.relativePan(new Point(-e.deltaX, -e.deltaY));
      }
      sync(canvas);
    });
    const offDown = canvas.on("mouse:down:before", ({ e }) => {
      const middle = "button" in e && e.button === 1;
      if (!panModeRef.current && !spaceRef.current && !middle) return;
      const point = canvas.getViewportPoint(e);
      last = { x: point.x, y: point.y };
      panning.current = true;
      saved = {
        skipTargetFind: canvas.skipTargetFind,
        selection: canvas.selection,
      };
      canvas.skipTargetFind = true;
      canvas.selection = false;
    });
    const offMove = canvas.on("mouse:move", ({ e }) => {
      if (!last) return;
      const point = canvas.getViewportPoint(e);
      canvas.relativePan(new Point(point.x - last.x, point.y - last.y));
      last = { x: point.x, y: point.y };
      sync(canvas);
    });
    const offUp = canvas.on("mouse:up", () => {
      if (!last) return;
      last = null;
      panning.current = false;
      canvas.set(saved);
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space" || handlesOwnKeys(event.target)) return;
      event.preventDefault();
      spaceRef.current = event.type === "keydown";
      canvas.defaultCursor =
        spaceRef.current || panModeRef.current ? "grab" : "default";
      canvas.setCursor(canvas.defaultCursor);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    return () => {
      offWheel();
      offDown();
      offMove();
      offUp();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [canvas, sync]);

  return { canvas, artboard, panning, zoomFit, zoomTo, zoomStep };
}
