"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/**
 * Decode just far enough to read the image's natural size. Every tool wants
 * to report what it was given, and some need it to decide what they can
 * offer, so it is measured once here rather than in each pipeline.
 */
async function measure(
  file: File,
): Promise<{ sourceWidth: number; sourceHeight: number } | undefined> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { sourceWidth: bitmap.width, sourceHeight: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    // A file the browser cannot decode will fail again, and more usefully,
    // in the processor, no need to report it twice.
    return undefined;
  }
}

/**
 * A generic, reusable queue for client-side image processing tools. Manages
 * item state, object-URL lifecycles, abort signals, and sequential processing
 * so heavy passes never run concurrently. The work itself is delegated to
 * `process`.
 */
export function useImageQueue<TResult extends QueueOutput>(
  process: QueueProcessor<TResult>,
) {
  const [items, setItems] = useState<ImageQueueItem<TResult>[]>([]);
  const itemsRef = useRef<ImageQueueItem<TResult>[]>([]);
  const controllersRef = useRef(new Map<string, AbortController>());
  const idRef = useRef(0);

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

      newItems.forEach((item) => {
        void measure(item.file).then((size) => {
          if (size) updateItem(item.id, size);
        });
      });

      // Process sequentially to avoid running several heavy passes at once.
      void newItems.reduce(
        (chain, item) => chain.then(() => processItem(item)),
        Promise.resolve(),
      );
    },
    [processItem, updateItem],
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
