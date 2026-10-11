"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Canvas } from "fabric";

import type { EditorDocument } from "@/lib/image/editor/document";
import {
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
  type History,
} from "@/lib/image/editor/history";

/** Rapid changes (a slider drag, a burst of nudges) land as one undo step. */
const COMMIT_DELAY = 250;

interface Snapshot {
  doc: EditorDocument;
  scene: Record<string, unknown>;
}

/**
 * Undo and redo, stored as serialised snapshots of the whole scene. Images
 * are referenced by blob URL, so a snapshot is small even for a big photo.
 *
 * `restore` is handed the parsed snapshot and does the actual rebuild, since
 * a document change also has to reach React state and the viewport.
 */
export function useEditorHistory(
  canvas: Canvas | null,
  doc: EditorDocument | null,
  restore: (snapshot: Snapshot) => Promise<void>,
) {
  const history = useRef<History<string> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const restoring = useRef(false);
  const docRef = useRef(doc);
  // `version` counts every change, undo and redo, so autosave knows when to run.
  const [flags, setFlags] = useState({
    canUndo: false,
    canRedo: false,
    version: 0,
  });

  useEffect(() => {
    docRef.current = doc;
  });

  const publish = useCallback((next: History<string>) => {
    history.current = next;
    setFlags((current) => ({
      canUndo: next.past.length > 0,
      canRedo: next.future.length > 0,
      version: current.version + 1,
    }));
  }, []);

  const snapshot = useCallback((): string | null => {
    if (!canvas || !docRef.current) return null;
    return JSON.stringify({ doc: docRef.current, scene: canvas.toObject() });
  }, [canvas]);

  const commitNow = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    const next = snapshot();
    if (!next || restoring.current) return;
    publish(
      history.current
        ? pushHistory(history.current, next)
        : createHistory(next),
    );
  }, [snapshot, publish]);

  const commit = useCallback(() => {
    if (restoring.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(commitNow, COMMIT_DELAY);
  }, [commitNow]);

  const travel = useCallback(
    async (step: typeof undoHistory) => {
      if (timer.current) commitNow();
      const current = history.current;
      if (!current || restoring.current) return;
      const next = step(current);
      if (next === current) return;
      restoring.current = true;
      try {
        await restore(JSON.parse(next.present) as Snapshot);
        publish(next);
      } finally {
        restoring.current = false;
      }
    },
    [commitNow, publish, restore],
  );

  /** Makes what is on screen now the bottom of the undo stack. */
  const reset = useCallback(() => {
    history.current = null;
    commitNow();
  }, [commitNow]);

  const undo = useCallback(() => travel(undoHistory), [travel]);
  const redo = useCallback(() => travel(redoHistory), [travel]);

  // Direct transforms on the canvas (drag, scale, rotate, finishing a text
  // edit) each add a step; everything else commits from its own action.
  useEffect(() => {
    if (!canvas) return;
    const offModified = canvas.on("object:modified", commit);
    const offText = canvas.on("text:editing:exited", commit);
    return () => {
      offModified();
      offText();
      clearTimeout(timer.current);
    };
  }, [canvas, commit]);

  return { commit, reset, undo, redo, ...flags };
}

export type { Snapshot };

export type EditorHistory = ReturnType<typeof useEditorHistory>;
