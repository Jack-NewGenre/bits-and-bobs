"use client";

import { DownloadCloud } from "lucide-react";

import type {
  ImageQueueItem,
  ImageQueueStatus,
  QueueOutput,
} from "@/hooks/use-image-queue";
import { Button } from "@/components/ui/button";
import { ImageDropzone } from "@/components/molecules/image-dropzone";
import { QueueList, type QueueListItem } from "@/components/molecules/queue-list";
import { ListHeader } from "@/components/molecules/list-header";
import type { ImageToolQueue } from "@/hooks/use-image-tool-queue";

function toListItem(
  item: ImageQueueItem<QueueOutput>,
  statusLabel: Record<ImageQueueStatus, string>,
  transparent?: boolean,
): QueueListItem {
  return {
    id: item.id,
    name: item.name,
    previewUrl: item.resultUrl ?? item.originalUrl,
    status: item.status,
    statusLabel: item.progressLabel ?? statusLabel[item.status],
    progress: item.progress,
    error: item.error,
    transparent,
  };
}

interface ImageToolShellProps<TSettings, TResult extends QueueOutput> {
  /** The whole queue from useImageToolQueue: the shell wires itself up. */
  queue: ImageToolQueue<TSettings, TResult>;
  dropzoneHint: string;
  /** Shown in the results pane when no item is selected yet. */
  emptyStateLabel: string;
  /** The tool-specific result panel for the selected item, if any. */
  resultPanel: React.ReactNode;
  /** Render a checkerboard behind queue thumbnails (for transparent results). */
  transparentThumbnails?: boolean;
}

/**
 * Shared layout for the image-tool pattern: dropzone, processing queue with
 * a "download all" action, and a results pane for the selected item. Each
 * tool supplies its own dropzone copy, status labels, and result panel.
 */
export function ImageToolShell<TSettings, TResult extends QueueOutput>({
  queue,
  dropzoneHint,
  emptyStateLabel,
  resultPanel,
  transparentThumbnails,
}: ImageToolShellProps<TSettings, TResult>) {
  const {
    items,
    statusLabel,
    selectedItem,
    setPinnedId,
    removeItem,
    retryItem,
    addFiles,
    clear,
    doneItems,
    handleReject,
    handleDownloadAll,
  } = queue;

  return (
    <div className="space-y-6">
      <ImageDropzone onFiles={addFiles} onReject={handleReject} hint={dropzoneHint} />

      {items.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-3">
            <ListHeader
              title="Queue"
              count={items.length}
              onClear={clear}
              showIcon
            />

            <QueueList
              items={items.map((item: ImageQueueItem<QueueOutput>) =>
                toListItem(item, statusLabel, transparentThumbnails),
              )}
              selectedId={selectedItem?.id}
              onSelect={setPinnedId}
              onRemove={removeItem}
              onRetry={retryItem}
            />

            {doneItems.length > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadAll}
                className="w-full"
              >
                <DownloadCloud className="size-4" />
                Download all ({doneItems.length})
              </Button>
            )}
          </div>

          <div>
            {resultPanel ?? (
              <div className="text-muted-foreground flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed text-sm">
                {emptyStateLabel}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
