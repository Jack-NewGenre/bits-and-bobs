"use client";

import { useEffect, useState } from "react";
import type { Canvas } from "fabric";

import { renderThumbnail } from "@/lib/image/editor/thumbnail";

/** Long enough that a drag or a brush stroke redraws the previews once, at the end. */
const THUMBNAIL_DELAY = 200;
/** The longest the previews go stale while the canvas keeps re-rendering. */
const MAX_WAIT = 1000;

type Thumbnails = Readonly<Record<string, string>>;

/**
 * A small preview of every layer, keyed by layer id. Redrawn shortly after the
 * canvas settles, so painting, moving and adjusting all show up in the panel.
 * Text layers are left out and show their kind icon instead.
 */
export function useLayerThumbnails(canvas: Canvas | null): Thumbnails {
  const [state, setState] = useState<{
    canvas: Canvas | null;
    thumbnails: Thumbnails;
  }>({
    canvas: null,
    thumbnails: {},
  });

  useEffect(() => {
    if (!canvas) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    let before: Thumbnails = {};
    const update = () => {
      const next: Record<string, string> = {};
      for (const object of canvas.getObjects()) {
        const id = object.layerId;
        // Text is unreadable at this size, so it keeps its "T" tile, as in Photoshop.
        if (!id || object.layerKind === "text") continue;
        const url = renderThumbnail(object) ?? before[id];
        if (url) next[id] = url;
      }
      const ids = Object.keys(next);
      const same =
        ids.length === Object.keys(before).length &&
        ids.every((id) => next[id] === before[id]);
      if (same) return;
      before = next;
      setState({ canvas, thumbnails: next });
    };

    // Waits for a quiet spell, but never longer than MAX_WAIT: the marching ants
    // re-render the canvas constantly while a selection is up.
    let waitingSince = 0;
    const schedule = () => {
      const now = Date.now();
      if (timer === undefined) waitingSince = now;
      clearTimeout(timer);
      const wait = Math.min(THUMBNAIL_DELAY, waitingSince + MAX_WAIT - now);
      timer = setTimeout(
        () => {
          timer = undefined;
          update();
        },
        Math.max(wait, 0),
      );
    };

    schedule();
    const off = canvas.on("after:render", schedule);
    return () => {
      off();
      clearTimeout(timer);
    };
  }, [canvas]);

  return state.canvas === canvas ? state.thumbnails : {};
}
