"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  useImageQueue,
  type DoneQueueItem,
  type ImageQueueStatus,
  type QueueOutput,
  type QueueProcessor,
} from "@/hooks/use-image-queue";
import type { RejectedFile } from "@/lib/image/file-intake";
import { downloadZip } from "@/lib/zip";

const BASE_STATUS_LABEL: Record<Exclude<ImageQueueStatus, "processing">, string> =
  {
    queued: "Queued",
    done: "Done",
    error: "Failed",
  };

export interface DownloadAllOptions<TSettings, TResult extends QueueOutput> {
  /** Verb shown in the loading toast, e.g. "Tracing" or "Enhancing". */
  actionLabel: string;
  /** Re-process a done item with the current settings for the zip entry. */
  buildEntry: (
    item: DoneQueueItem<TResult>,
    settings: TSettings,
  ) => Promise<{ name: string; blob: Blob }>;
  zipFilename: string;
}

export interface UseImageToolQueueOptions<
  TSettings,
  TResult extends QueueOutput,
> {
  processor: QueueProcessor<TResult>;
  defaultSettings: TSettings;
  /** Status label shown in the queue while an item processes, e.g. "Tracing…". */
  processingLabel: string;
  downloadAll: DownloadAllOptions<TSettings, TResult>;
}

/**
 * Shared state/orchestration for the image-tool pattern: a processing queue,
 * a pinned/selected result, live-editable settings, and a "download all"
 * flow that re-processes every finished item into a zip. Each tool supplies
 * its own processor, settings shape, and per-item download logic.
 */
export type ImageToolQueue<TSettings, TResult extends QueueOutput> = ReturnType<
  typeof useImageToolQueue<TSettings, TResult>
>;

export function useImageToolQueue<TSettings, TResult extends QueueOutput>({
  processor,
  defaultSettings,
  processingLabel,
  downloadAll,
}: UseImageToolQueueOptions<TSettings, TResult>) {
  const { items, addFiles, removeItem, retryItem, clear } =
    useImageQueue(processor);
  // The user's explicit choice; falls back to the first finished item.
  const [pinnedId, setPinnedId] = useState<string>();
  const [settings, setSettings] = useState<TSettings>(defaultSettings);

  const statusLabel: Record<ImageQueueStatus, string> = useMemo(
    () => ({ ...BASE_STATUS_LABEL, processing: processingLabel }),
    [processingLabel],
  );

  const doneItems = useMemo(
    () =>
      items.filter(
        (item): item is DoneQueueItem<TResult> =>
          item.status === "done" &&
          item.result !== undefined &&
          item.resultUrl !== undefined,
      ),
    [items],
  );

  const selectedItem =
    doneItems.find((item) => item.id === pinnedId) ?? doneItems[0];

  const handleReject = (rejected: RejectedFile[]) => {
    toast.error(
      rejected.length === 1
        ? `${rejected[0].name}: ${rejected[0].reason}`
        : `${rejected.length} files skipped (unsupported type or too large)`,
    );
  };

  const handleDownloadAll = async () => {
    if (doneItems.length === 0) return;
    const toastId = toast.loading(
      `${downloadAll.actionLabel} ${doneItems.length} images…`,
    );
    try {
      const entries: { name: string; blob: Blob }[] = [];
      for (const item of doneItems) {
        entries.push(await downloadAll.buildEntry(item, settings));
      }
      await downloadZip(entries, downloadAll.zipFilename);
      toast.success(`Downloaded ${entries.length} images`, { id: toastId });
    } catch {
      toast.error("Could not prepare the download", { id: toastId });
    }
  };

  return {
    items,
    addFiles,
    removeItem,
    retryItem,
    clear,
    setPinnedId,
    settings,
    setSettings,
    statusLabel,
    doneItems,
    selectedItem,
    handleReject,
    handleDownloadAll,
  };
}
