"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { measureImage } from "@/lib/image/dimensions";
import { isAbortError } from "@/lib/utils";

export type ImageQueueStatus = "queued" | "processing" | "done" | "error";

/** Every tool's processor resolves to at least a downloadable blob. */
export interface QueueOutput {
  blob: Blob;
}

export interface ImageQueueItem<TResult extends QueueOutput = QueueOutput> {
  id: string;
  file: File;
  name: string;
  /** Object URL of the original image. */
  originalUrl: string;
  /** Natural size of the dropped file, measured once when it is added. */
  sourceWidth?: number;
  sourceHeight?: number;
  status: ImageQueueStatus;
  /** 0–1 progress for the processing stage. */
  progress: number;
  /** Overrides the generic status label while processing, e.g. "Loading model…". */
  progressLabel?: string;
  /** Processed output. */
  result?: TResult;
  /** Object URL of the result blob, for preview. */
  resultUrl?: string;
  error?: string;
}

/** A finished item, whose result is guaranteed to be present. */
export type DoneQueueItem<TResult extends QueueOutput> =
  ImageQueueItem<TResult> & { result: TResult; resultUrl: string };

export interface QueueProgress {
  fraction: number;
  /** Optional stage label shown in place of the generic status. */
  label?: string;
}

/** Processes one file into a result, reporting progress and honouring aborts. */
export type QueueProcessor<TResult extends QueueOutput> = (
  file: File,
  onProgress: (progress: QueueProgress) => void,
  signal: AbortSignal,
) => Promise<TResult>;

export interface ImageQueueOptions {
  /**
   * How many items may process at once, read when files are added.
   *
   * A function rather than a number because the answer depends on the machine,
   * which is not known during server rendering. One by default: a processor
   * that works on the main thread gains nothing from being asked for several
   * heavy passes at once, and would hold several images in memory to do it.
   */
  concurrency?: () => number;
}

/**
 * A generic, reusable queue for client-side image processing tools. Manages
 * item state, object-URL lifecycles, abort signals, and sequential processing
 * so heavy passes never run concurrently. The work itself is delegated to
 * `process`.
 */
export function useImageQueue<TResult extends QueueOutput>(
  process: QueueProcessor<TResult>,
  { concurrency }: ImageQueueOptions = {},
) {
  const [items, setItems] = useState<ImageQueueItem<TResult>[]>([]);
  const itemsRef = useRef<ImageQueueItem<TResult>[]>([]);
  const controllersRef = useRef(new Map<string, AbortController>());
  const idRef = useRef(0);
  /** Items waiting for a free lane, and how many lanes are working. */
  const waitingRef = useRef<ImageQueueItem<TResult>[]>([]);
  const lanesRef = useRef(0);
  const processItemRef = useRef<(item: ImageQueueItem<TResult>) => Promise<void>>(
    async () => {},
  );

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const releaseItem = useCallback((item: ImageQueueItem<TResult>) => {
    controllersRef.current.get(item.id)?.abort();
    controllersRef.current.delete(item.id);
    URL.revokeObjectURL(item.originalUrl);
    if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
  }, []);

  const updateItem = useCallback(
    (id: string, patch: Partial<ImageQueueItem<TResult>>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const processItem = useCallback(
    async (item: ImageQueueItem<TResult>) => {
      const controller = controllersRef.current.get(item.id);
      if (!controller || controller.signal.aborted) return;

      try {
        updateItem(item.id, { status: "processing", progress: 0 });
        const result = await process(
          item.file,
          ({ fraction, label }) =>
            updateItem(item.id, {
              status: "processing",
              progress: fraction,
              progressLabel: label,
            }),
          controller.signal,
        );
        // The item may have been removed while processing; if so, drop the
        // result rather than creating an object URL that nothing will revoke.
        if (controller.signal.aborted) return;
        updateItem(item.id, {
          status: "done",
          progress: 1,
          progressLabel: undefined,
          result,
          resultUrl: URL.createObjectURL(result.blob),
        });
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return;
        updateItem(item.id, {
          status: "error",
          progressLabel: undefined,
          error: error instanceof Error ? error.message : "Processing failed",
        });
      } finally {
        controllersRef.current.delete(item.id);
      }
    },
    [process, updateItem],
  );

  useEffect(() => {
    processItemRef.current = processItem;
  }, [processItem]);

  /**
   * One lane of work: takes the next waiting item, processes it, repeats. As
   * many lanes run as `concurrency` allows, so a batch spreads across the
   * worker pool instead of trickling through one at a time.
   */
  const runLane = useCallback(async () => {
    lanesRef.current += 1;
    try {
      for (;;) {
        const next = waitingRef.current.shift();
        if (!next) return;
        await processItemRef.current(next);
      }
    } finally {
      lanesRef.current -= 1;
    }
  }, []);

  const addFiles = useCallback(
    (files: File[]) => {
      const newItems: ImageQueueItem<TResult>[] = files.map((file) => {
        idRef.current += 1;
        const id = `queue-${idRef.current}`;
        controllersRef.current.set(id, new AbortController());
        return {
          id,
          file,
          name: file.name,
          originalUrl: URL.createObjectURL(file),
          status: "queued",
          progress: 0,
        };
      });

      setItems((prev) => [...prev, ...newItems]);

      // Every tool wants to report the size of what it was given, and some
      // need it to decide what they can offer. `measureImage` reads it out of
      // the file header, so dropping twenty photos no longer decodes twenty
      // images just to ask how big they are, on top of the decode each
      // pipeline is about to do anyway.
      newItems.forEach((item) => {
        void measureImage(item.file).then((size) => {
          if (size) updateItem(item.id, size);
        });
      });

      waitingRef.current.push(...newItems);
      // Opening a lane runs it up to its first await synchronously, so the
      // count is already correct on the next turn of the loop and a second
      // batch dropped mid-run cannot push past the limit.
      const limit = Math.max(1, concurrency?.() ?? 1);
      while (lanesRef.current < limit && waitingRef.current.length > 0) {
        void runLane();
      }
    },
    [concurrency, runLane, updateItem],
  );

  const retryItem = useCallback(
    (id: string) => {
      const target = itemsRef.current.find((item) => item.id === id);
      if (!target || target.status !== "error") return;

      controllersRef.current.set(id, new AbortController());
      updateItem(id, {
        status: "queued",
        progress: 0,
        error: undefined,
        progressLabel: undefined,
      });
      void processItem(target);
    },
    [processItem, updateItem],
  );

  const removeItem = useCallback(
    (id: string) => {
      // Drop it from the waiting list too, so a lane does not pick up
      // something the user has already taken off the queue.
      waitingRef.current = waitingRef.current.filter((item) => item.id !== id);
      setItems((prev) => {
        const target = prev.find((item) => item.id === id);
        if (target) releaseItem(target);
        return prev.filter((item) => item.id !== id);
      });
    },
    [releaseItem],
  );

  /** Move an item up or down, where the queue's order is the output's. */
  const moveItem = useCallback((id: string, direction: -1 | 1) => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;

      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    waitingRef.current = [];
    itemsRef.current.forEach(releaseItem);
    setItems([]);
  }, [releaseItem]);

  // Abort in-flight work and revoke outstanding object URLs on unmount.
  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      itemsRef.current.forEach((item) => {
        controllers.get(item.id)?.abort();
        URL.revokeObjectURL(item.originalUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      });
      controllers.clear();
    };
  }, []);

  return { items, addFiles, removeItem, retryItem, moveItem, clear };
}
