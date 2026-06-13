"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ImageQueueStatus = "queued" | "processing" | "done" | "error";

export interface ImageQueueItem {
  id: string;
  file: File;
  name: string;
  /** Object URL of the original image. */
  originalUrl: string;
  status: ImageQueueStatus;
  /** 0–1 progress for the processing stage. */
  progress: number;
  /** Processed output blob. */
  result?: Blob;
  /** Object URL of the result, for preview. */
  resultUrl?: string;
  error?: string;
}

/** Processes one file into a result blob, reporting 0–1 progress. */
export type QueueProcessor = (
  file: File,
  onProgress: (fraction: number) => void,
) => Promise<Blob>;

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `queue-${idCounter}`;
}

/**
 * A generic, reusable queue for client-side image processing tools. Manages
 * item state, object-URL lifecycles, and sequential processing so heavy passes
 * never run concurrently. The actual work is delegated to `process`.
 */
export function useImageQueue(process: QueueProcessor) {
  const [items, setItems] = useState<ImageQueueItem[]>([]);
  const itemsRef = useRef<ImageQueueItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const updateItem = useCallback(
    (id: string, patch: Partial<ImageQueueItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const processItem = useCallback(
    async (item: ImageQueueItem) => {
      try {
        updateItem(item.id, { status: "processing", progress: 0 });
        const result = await process(item.file, (fraction) =>
          updateItem(item.id, { status: "processing", progress: fraction }),
        );
        // The item may have been removed while processing; if so, drop the
        // result rather than creating an object URL that nothing will revoke.
        if (!itemsRef.current.some((current) => current.id === item.id)) return;
        const resultUrl = URL.createObjectURL(result);
        updateItem(item.id, {
          status: "done",
          progress: 1,
          result,
          resultUrl,
        });
      } catch (error) {
        if (!itemsRef.current.some((current) => current.id === item.id)) return;
        updateItem(item.id, {
          status: "error",
          error: error instanceof Error ? error.message : "Processing failed",
        });
      }
    },
    [process, updateItem],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const newItems: ImageQueueItem[] = files.map((file) => ({
        id: nextId(),
        file,
        name: file.name,
        originalUrl: URL.createObjectURL(file),
        status: "queued",
        progress: 0,
      }));

      setItems((prev) => [...prev, ...newItems]);

      // Process sequentially to avoid running several heavy passes at once.
      void newItems.reduce(
        (chain, item) => chain.then(() => processItem(item)),
        Promise.resolve(),
      );
    },
    [processItem],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.originalUrl);
        if (target.resultUrl) URL.revokeObjectURL(target.resultUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    itemsRef.current.forEach((item) => {
      URL.revokeObjectURL(item.originalUrl);
      if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
    });
    setItems([]);
  }, []);

  // Revoke any outstanding object URLs on unmount.
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        URL.revokeObjectURL(item.originalUrl);
        if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
      });
    };
  }, []);

  return { items, addFiles, removeItem, clear };
}
