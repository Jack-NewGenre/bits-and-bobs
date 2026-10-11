"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";

import {
  applyBrush,
  createField,
  isIdentityField,
  renderLiquify,
  type LiquifyField,
  type LiquifyMode,
} from "@/lib/image/editor/liquify";
import { pixelsToCanvas } from "@/lib/image/editor/raster";

export interface LiquifySource {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface LiquifyBrushSettings {
  mode: LiquifyMode;
  /** Radius in layer pixels. */
  size: number;
  /** 1–100. */
  pressure: number;
}

interface Stroke {
  pointer: { x: number; y: number };
  last: { x: number; y: number };
  alt: boolean;
}

/**
 * Drives the Liquify preview: a displacement field the brush pushes around,
 * rendered onto `preview` one dirty rectangle at a time. Twirl, pucker, bloat
 * and reconstruct keep working while the button is held, as in Photoshop.
 */
export function useLiquify(
  source: LiquifySource | null,
  brush: LiquifyBrushSettings,
) {
  const preview = useRef<HTMLCanvasElement | null>(null);
  const field = useRef<LiquifyField | null>(null);
  const output = useRef<Uint8ClampedArray | null>(null);
  const stroke = useRef<Stroke | null>(null);
  const settings = useRef(brush);
  // Keyed by source, so opening Liquify on another layer starts unchanged.
  const [changedFor, setChangedFor] = useState<LiquifySource | null>(null);
  const changed = source !== null && changedFor === source;

  useEffect(() => {
    settings.current = brush;
  });

  const redraw = useCallback(() => {
    const canvas = preview.current;
    if (!source || !canvas || !field.current) return;
    output.current = renderLiquify(
      source.pixels,
      field.current,
      output.current ?? undefined,
    );
    const ctx = canvas.getContext("2d");
    ctx?.putImageData(
      new ImageData(output.current.slice(), source.width, source.height),
      0,
      0,
    );
  }, [source]);

  const start = useCallback(() => {
    if (!source) return;
    field.current = createField(source.width, source.height);
    output.current = null;
    redraw();
  }, [source, redraw]);

  useEffect(start, [start]);

  // The dialog mounts its canvas a commit or two after it opens, so the
  // first draw happens when the canvas arrives, not when the effect runs.
  const previewRef = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      preview.current = canvas;
      if (canvas) redraw();
    },
    [redraw],
  );

  const reset = useCallback(() => {
    start();
    setChangedFor(null);
  }, [start]);

  /** One step of the brush at the pointer, drawing only what changed. */
  const step = useCallback(() => {
    const current = stroke.current;
    const canvas = preview.current;
    if (!current || !field.current || !source || !canvas) return;
    const { mode, size, pressure } = settings.current;
    const { pointer, last } = current;
    const dirty = applyBrush(field.current, mode, {
      x: pointer.x,
      y: pointer.y,
      radius: size,
      pressure: pressure / 100,
      dx: pointer.x - last.x,
      dy: pointer.y - last.y,
      clockwise: !current.alt,
    });
    current.last = pointer;
    if (!dirty) return;
    const out = renderLiquify(
      source.pixels,
      field.current,
      output.current ?? undefined,
      dirty,
    );
    output.current = out;
    const patch = new ImageData(dirty.width, dirty.height);
    for (let row = 0; row < dirty.height; row++) {
      const offset = ((dirty.top + row) * source.width + dirty.left) * 4;
      patch.data.set(
        out.subarray(offset, offset + dirty.width * 4),
        row * dirty.width * 4,
      );
    }
    canvas.getContext("2d")?.putImageData(patch, dirty.left, dirty.top);
    setChangedFor(source);
  }, [source]);

  // Brushes that work in place keep stepping each frame while held.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (stroke.current && settings.current.mode !== "forward") step();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [step]);

  /** Where the pointer is, in layer pixels, however the preview is scaled. */
  const toPixels = (event: PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const { width, height } = event.currentTarget;
    return {
      x: ((event.clientX - box.left) / box.width) * width,
      y: ((event.clientY - box.top) / box.height) * height,
    };
  };

  const handlers = {
    onPointerDown: (event: PointerEvent<HTMLCanvasElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      const at = toPixels(event);
      stroke.current = { pointer: at, last: at, alt: event.altKey };
    },
    onPointerMove: (event: PointerEvent<HTMLCanvasElement>) => {
      if (!stroke.current) return;
      stroke.current = {
        ...stroke.current,
        pointer: toPixels(event),
        alt: event.altKey,
      };
      if (settings.current.mode === "forward") step();
    },
    onPointerUp: () => {
      stroke.current = null;
    },
  };

  /** The warped pixels, or null when nothing moved. */
  const result = useCallback((): HTMLCanvasElement | null => {
    if (!source || !field.current || isIdentityField(field.current))
      return null;
    const out = renderLiquify(source.pixels, field.current);
    return pixelsToCanvas(out, source.width, source.height);
  }, [source]);

  return { preview: previewRef, handlers, reset, result, changed };
}
