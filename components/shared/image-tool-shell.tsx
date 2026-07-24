"use client";

import { DownloadCloud, Trash2 } from "lucide-react";

import type { ImageQueueItem, ImageQueueStatus } from "@/hooks/use-image-queue";
import { Button } from "@/components/ui/button";
import {
  ImageDropzone,
  type RejectedFile,
} from "@/components/shared/image-dropzone";
import { QueueList, type QueueListItem } from "@/components/shared/queue-list";

function toListItem(
  item: ImageQueueItem,
  statusLabel: Record<ImageQueueStatus, string>,
): QueueListItem {
  return {
    id: item.id,
    name: item.name,
    previewUrl: item.resultUrl ?? item.originalUrl,
    status: item.status,
    statusLabel: statusLabel[item.status],
    progress: item.progress,
    error: item.error,
  };
}

interface ImageToolShellProps {
  items: ImageQueueItem[];
  statusLabel: Record<ImageQueueStatus, string>;
  selectedId?: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onFiles: (files: File[]) => void;
  onReject: (rejected: RejectedFile[]) => void;
  onClear: () => void;
  dropzoneHint: string;
  doneCount: number;
  onDownloadAll: () => void;
  /** Shown in the results pane when no item is selected yet. */
  emptyStateLabel: string;
  /** The tool-specific result panel for the selected item, if any. */
  resultPanel: React.ReactNode;
}

/**
 * Shared layout for the image-tool pattern: dropzone, processing queue with
 * a "download all" action, and a results pane for the selected item. Each
 * tool supplies its own dropzone copy, status labels, and result panel.
 */
export function ImageToolShell({
  items,
  statusLabel,
  selectedId,
  onSelect,
  onRemove,
  onFiles,
  onReject,
  onClear,
  dropzoneHint,
  doneCount,
  onDownloadAll,
  emptyStateLabel,
  resultPanel,
}: ImageToolShellProps) {
  return (
    <div className="space-y-6">
      <ImageDropzone onFiles={onFiles} onReject={onReject} hint={dropzoneHint} />

      {items.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">
                Queue
                <span className="text-muted-foreground ml-1.5 font-normal">
                  ({items.length})
                </span>
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-muted-foreground"
              >
                <Trash2 className="size-4" />
                Clear
              </Button>
            </div>

            <QueueList
              items={items.map((item) => toListItem(item, statusLabel))}
              selectedId={selectedId}
              onSelect={onSelect}
              onRemove={onRemove}
            />

            {doneCount > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={onDownloadAll}
                className="w-full"
              >
                <DownloadCloud className="size-4" />
                Download all ({doneCount})
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
