"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  removeImageBackground,
  type RemovalProgress,
} from "@/lib/background-removal";

export type QueueItemStatus =
  | "queued"
  | "loading-model"
  | "processing"
  | "done"
  | "error";

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  /** Object URL of the original image. */
  originalUrl: string;
  status: QueueItemStatus;
  progress: number;
  /** Transparent cutout produced by the model. */
  cutout?: Blob;
  /** Object URL of the cutout, for preview. */
  cutoutUrl?: string;
  error?: string;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `item-${idCounter}`;
}

function progressToStatus(stage: RemovalProgress["stage"]): QueueItemStatus {
  if (stage === "fetching") return "loading-model";
  if (stage === "done") return "done";
  return "processing";
}

export function useBgRemovalQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const itemsRef = useRef<QueueItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const updateItem = useCallback(
    (id: string, patch: Partial<QueueItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const processItem = useCallback(
    async (item: QueueItem) => {
      try {
        const cutout = await removeImageBackground(item.file, {
          onProgress: ({ stage, fraction }) => {
            updateItem(item.id, {
              status: progressToStatus(stage),
              progress: stage === "done" ? 1 : fraction,
            });
          },
        });
        // The item may have been removed while processing; if so, drop the
        // cutout rather than creating an object URL that nothing will revoke.
        if (!itemsRef.current.some((current) => current.id === item.id)) return;
        const cutoutUrl = URL.createObjectURL(cutout);
        updateItem(item.id, {
          status: "done",
          progress: 1,
          cutout,
          cutoutUrl,
        });
      } catch (error) {
        if (!itemsRef.current.some((current) => current.id === item.id)) return;
        updateItem(item.id, {
          status: "error",
          error: error instanceof Error ? error.message : "Processing failed",
        });
      }
    },
    [updateItem],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const newItems: QueueItem[] = files.map((file) => ({
        id: nextId(),
        file,
        name: file.name,
        originalUrl: URL.createObjectURL(file),
        status: "queued",
        progress: 0,
      }));

      setItems((prev) => [...prev, ...newItems]);

      // Process sequentially to avoid loading multiple models at once.
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
        if (target.cutoutUrl) URL.revokeObjectURL(target.cutoutUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    itemsRef.current.forEach((item) => {
      URL.revokeObjectURL(item.originalUrl);
      if (item.cutoutUrl) URL.revokeObjectURL(item.cutoutUrl);
    });
    setItems([]);
  }, []);

  // Revoke any outstanding object URLs on unmount.
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        URL.revokeObjectURL(item.originalUrl);
        if (item.cutoutUrl) URL.revokeObjectURL(item.cutoutUrl);
      });
    };
  }, []);

  return { items, addFiles, removeItem, clear };
}
