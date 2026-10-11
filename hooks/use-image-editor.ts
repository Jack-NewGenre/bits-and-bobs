"use client";

import "@/lib/image/editor/style-render";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Point, type Canvas, type FabricImage } from "fabric";
import { toast } from "sonner";

import { downloadBlob } from "@/lib/download";
import {
  exportDocument,
  exportFilename,
  loadImageLayer,
  type ExportOptions,
} from "@/lib/image/editor/canvas-io";
import {
  clampDimension,
  DEFAULT_DOCUMENT,
  type EditorDocument,
} from "@/lib/image/editor/document";
import { tagLayer } from "@/lib/image/editor/layers";
import type { Project, Scene } from "@/lib/image/editor/project";
import { applyDocument, loadScene, placeImage } from "@/lib/image/editor/scene";
import { createText } from "@/lib/image/editor/shapes";
import type { EditorTool } from "@/lib/image/editor/shortcuts";
import {
  DEFAULT_TOOL_STYLE,
  type ToolStyle,
} from "@/lib/image/editor/tool-style";
import { NO_INSETS, type Insets } from "@/lib/image/editor/viewport";
import { useContentAwareFill } from "@/hooks/use-content-aware-fill";
import { useEditorActions } from "@/hooks/use-editor-actions";
import { useEditorCrop } from "@/hooks/use-editor-crop";
import { useEditorFill } from "@/hooks/use-editor-fill";
import { useEditorHistory, type Snapshot } from "@/hooks/use-editor-history";
import { useEditorLayers } from "@/hooks/use-editor-layers";
import { useEditorLoupe } from "@/hooks/use-editor-loupe";
import { useEditorMasks } from "@/hooks/use-editor-masks";
import { useEditorPainting } from "@/hooks/use-editor-painting";
import { useEditorProject } from "@/hooks/use-editor-project";
import { useEditorSelection } from "@/hooks/use-editor-selection";
import { useEditorSnapping } from "@/hooks/use-editor-snapping";
import { useEditorTools } from "@/hooks/use-editor-tools";
import { useEditorViewport } from "@/hooks/use-editor-viewport";
import { useLayerLiquify } from "@/hooks/use-layer-liquify";

interface Opening {
  name: string;
  image?: FabricImage;
  scene?: Scene;
}

/**
 * Everything the image editor does, gathered in one place for its UI: the
 * document, the canvas and viewport, the tools, layers, selections, undo,
 * saving and export.
 */
export function useImageEditor(
  hostRef: RefObject<HTMLDivElement | null>,
  backdropRef: RefObject<HTMLDivElement | null>,
  fitInsets: Insets = NO_INSETS,
  onOpen: () => void = () => {},
) {
  const [doc, setDoc] = useState<EditorDocument>(DEFAULT_DOCUMENT);
  // Bumped for every new document, so the canvas is prepared afresh.
  const [generation, setGeneration] = useState(0);
  const [name, setName] = useState("Untitled");
  const [tool, setTool] = useState<EditorTool>("select");
  const [style, setStyle] = useState<ToolStyle>(DEFAULT_TOOL_STYLE);
  const [snapping, setSnapping] = useState(true);
  const pending = useRef<Opening | null>(null);
  const holdSaveRef = useRef(false);

  const viewport = useEditorViewport(
    hostRef,
    backdropRef,
    doc,
    tool === "hand",
    fitInsets,
  );
  const { canvas, artboard, panning, zoomFit, zoomTo, zoomStep } = viewport;

  const deselectRef = useRef(() => {});
  const restore = useCallback(
    async ({ doc: saved, scene }: Snapshot) => {
      if (!canvas) return;
      await loadScene(canvas, scene).catch(() => undefined);
      if (saved.width !== doc.width || saved.height !== doc.height)
        deselectRef.current();
      setDoc(saved);
      applyDocument(canvas, saved);
    },
    [canvas, doc],
  );

  const history = useEditorHistory(canvas, doc, restore);
  const layers = useEditorLayers(canvas, doc, history.commit);
  const selection = useEditorSelection(canvas, doc, tool, style, panning);
  const masks = useEditorMasks(canvas, selection.selectionRef);
  const { deselect, selectionRef } = selection;
  useEffect(() => void (deselectRef.current = deselect));
  const { resync, setEditingMask } = masks;
  const { commit } = history;
  const onPainted = useCallback(() => {
    resync();
    commit();
  }, [resync, commit]);

  useEditorTools(canvas, tool, style, history.commit, setTool, panning);
  const { cloneMarker } = useEditorPainting(
    canvas,
    { doc, tool, style, editingMask: masks.editingMask, onPainted },
    selectionRef,
  );
  useEditorFill(
    canvas,
    { doc, tool, style, setStyle, onPainted },
    selectionRef,
  );
  useEditorSnapping(canvas, doc, snapping && tool === "select");
  const contentAwareFill = useContentAwareFill(
    canvas,
    doc,
    selectionRef,
    commit,
  );
  const liquify = useLayerLiquify(canvas, commit);

  // A fresh canvas or document gets its settings, and its opening image or
  // project, before the first undo step is taken. Held in a ref so it runs
  // once per document, not again every time the document changes.
  const prepareCanvas = useRef<(created: Canvas) => void>(() => {});
  // A project still loading when another document opens is abandoned.
  const loadingRef = useRef<AbortController | null>(null);
  useEffect(() => {
    prepareCanvas.current = (created) => {
      applyDocument(created, doc);
      const opening = pending.current;
      pending.current = null;
      if (opening?.image) placeImage(created, opening.image, opening.name, doc);
      const { signal } = (loadingRef.current = new AbortController());
      const loading = opening?.scene
        ? loadScene(created, opening.scene, signal)
        : Promise.resolve();
      void loading
        .catch(() => {
          if (signal.aborted) return;
          holdSaveRef.current = true;
          toast.error("Part of that project could not be loaded.");
        })
        .finally(() => {
          if (signal.aborted) return;
          applyDocument(created, doc);
          zoomFit();
          history.reset();
        });
    };
  });
  useEffect(() => {
    if (canvas) prepareCanvas.current(canvas);
  }, [canvas, generation]);

  const newDocument = useCallback(
    (next: EditorDocument, opening?: Opening) => {
      loadingRef.current?.abort();
      canvas?.clear();
      pending.current = opening ?? null;
      deselect();
      setEditingMask(false);
      setName(opening?.name ?? "Untitled");
      setDoc(next);
      setTool("select");
      setGeneration((current) => current + 1);
    },
    [canvas, deselect, setEditingMask],
  );

  /** Opens an image as a new document the size of the image. */
  const openFile = useCallback(
    async (file: File) => {
      try {
        const image = await loadImageLayer(file);
        newDocument(
          { width: image.width, height: image.height, background: null },
          { image, name: file.name },
        );
      } catch {
        toast.error("That image could not be opened.");
      }
    },
    [newDocument],
  );

  const openProject = useCallback(
    async (project: Project) =>
      newDocument(project.doc, { name: project.name, scene: project.scene }),
    [newDocument],
  );

  const project = useEditorProject(
    canvas,
    doc,
    name,
    history.version,
    openProject,
    holdSaveRef,
  );
  const loupe = useEditorLoupe(
    canvas,
    doc,
    tool === "eyedropper",
    history.version,
  );

  const addText = useCallback(() => {
    if (!canvas) return;
    const text = createText(
      { x: doc.width / 2, y: doc.height / 2 },
      style.fill,
      style.fontSize,
      style.fontFamily,
    );
    tagLayer(text, "text", "Text", canvas.getObjects());
    canvas.add(text);
    text.setPositionByOrigin(
      new Point(doc.width / 2, doc.height / 2),
      "center",
      "center",
    );
    canvas.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
    canvas.requestRenderAll();
    history.commit();
  }, [canvas, doc, style.fill, style.fontSize, style.fontFamily, history]);

  /** Adds images as layers; into an empty canvas, the first opens instead. */
  const addImages = useCallback(
    async (files: File[]) => {
      if (!canvas || files.length === 0) return;
      if (canvas.getObjects().length === 0 && files.length === 1)
        return openFile(files[0]);
      try {
        const images = await Promise.all(files.map(loadImageLayer));
        images.forEach((image, index) =>
          placeImage(canvas, image, files[index].name, doc),
        );
        setTool("select");
        canvas.setActiveObject(images[images.length - 1]);
        canvas.requestRenderAll();
        history.commit();
      } catch {
        toast.error("One of those images could not be opened.");
      }
    },
    [canvas, doc, history, openFile],
  );

  const updateDocument = useCallback(
    (patch: Partial<EditorDocument>) => {
      if (!canvas) return null;
      const next = {
        ...doc,
        ...patch,
        width: clampDimension(patch.width ?? doc.width),
        height: clampDimension(patch.height ?? doc.height),
      };
      // A selection belongs to one canvas size.
      if (next.width !== doc.width || next.height !== doc.height) deselect();
      setDoc(next);
      applyDocument(canvas, next);
      history.commit();
      return next;
    },
    [canvas, doc, history, deselect],
  );

  const selectTool = useCallback(() => setTool("select"), []);
  const { cropToContent } = useEditorCrop(
    canvas,
    { doc, tool, updateDocument, zoomFit, deselect, onDone: selectTool },
    selectionRef,
  );

  const exportImage = useCallback(
    async (options: ExportOptions) => {
      if (!canvas) return;
      try {
        const blob = await exportDocument(canvas, doc, options);
        downloadBlob(blob, exportFilename(name, options.format));
      } catch {
        toast.error("The image could not be exported.");
      }
    },
    [canvas, doc, name],
  );

  const runAction = useEditorActions({
    canvas,
    tool,
    setTool,
    style,
    setStyle,
    history,
    layers,
    masks,
    setSnapping,
    selection,
    project,
    zoomStep,
    zoomFit,
    zoomTo,
    onOpen,
  });

  return {
    doc,
    name,
    artboard,
    tool,
    setTool,
    style,
    setStyle,
    snapping,
    setSnapping,
    layers,
    history,
    selection,
    masks,
    project,
    loupe,
    cloneMarker,
    zoomFit,
    zoomTo,
    zoomStep,
    newDocument,
    openFile,
    addImages,
    addText,
    updateDocument,
    cropToContent,
    contentAwareFill,
    liquify,
    exportImage,
    runAction,
  };
}

export type ImageEditor = ReturnType<typeof useImageEditor>;
