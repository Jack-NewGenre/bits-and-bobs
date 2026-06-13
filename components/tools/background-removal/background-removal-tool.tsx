"use client";

import { useEffect, useMemo, useState } from "react";
import { DownloadCloud, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  useBgRemovalQueue,
  type QueueItem,
  type QueueItemStatus,
} from "@/hooks/use-bg-removal-queue";
import type { BackgroundSettings } from "@/hooks/use-composited-result";
import { downloadZip, toPngName } from "@/lib/download";
import { Button } from "@/components/ui/button";
import {
  ImageDropzone,
  type RejectedFile,
} from "@/components/shared/image-dropzone";
import {
  QueueList,
  type ProcessStatus,
  type QueueListItem,
} from "@/components/shared/queue-list";
import { ResultPanel } from "@/components/tools/background-removal/result-panel";

const DEFAULT_SETTINGS: BackgroundSettings = {
  mode: "transparent",
  color: "#ffffff",
};

const STATUS_LABEL: Record<QueueItemStatus, string> = {
  queued: "Queued",
  "loading-model": "Loading model…",
  processing: "Removing background…",
  done: "Done",
  error: "Failed",
};

function toListItem(item: QueueItem): QueueListItem {
  return {
    id: item.id,
    name: item.name,
    previewUrl: item.cutoutUrl ?? item.originalUrl,
    status:
      item.status === "loading-model"
        ? "processing"
        : (item.status as ProcessStatus),
    statusLabel: STATUS_LABEL[item.status],
    progress: item.progress,
    error: item.error,
    transparent: true,
  };
}

export function BackgroundRemovalTool() {
  const { items, addFiles, removeItem, clear } = useBgRemovalQueue();
  // The user's explicit choice; falls back to the first finished item.
  const [pinnedId, setPinnedId] = useState<string>();
  const [settings, setSettings] = useState<BackgroundSettings>(DEFAULT_SETTINGS);

  // Own the background image object URL's lifecycle here, where settings
  // persist across panel unmounts: revoke it when it's replaced or on unmount.
  useEffect(() => {
    const url = settings.imageUrl;
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [settings.imageUrl]);

  const handleClear = () => {
    clear();
    setSettings(DEFAULT_SETTINGS);
  };

  const doneItems = useMemo(
    () => items.filter((item) => item.status === "done"),
    [items],
  );

  // Derive the active selection: the pinned item if still finished, else the
  // first finished item. No effect/state-sync required.
  const selectedItem =
    doneItems.find((item) => item.id === pinnedId) ?? doneItems[0];
  const selectedId = selectedItem?.id;

  const handleReject = (rejected: RejectedFile[]) => {
    toast.error(
      rejected.length === 1
        ? `${rejected[0].name}: ${rejected[0].reason}`
        : `${rejected.length} files skipped (unsupported type or too large)`,
    );
  };

  const handleDownloadAll = async () => {
    const entries = doneItems
      .filter((item) => item.cutout)
      .map((item) => ({ name: toPngName(item.name), blob: item.cutout! }));
    if (entries.length === 0) return;
    await downloadZip(entries, "backgrounds-removed.zip");
    toast.success(`Downloaded ${entries.length} images`);
  };

  return (
    <div className="space-y-6">
      <ImageDropzone onFiles={addFiles} onReject={handleReject} />

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
                onClick={handleClear}
                className="text-muted-foreground"
              >
                <Trash2 className="size-4" />
                Clear
              </Button>
            </div>

            <QueueList
              items={items.map(toListItem)}
              selectedId={selectedId}
              onSelect={setPinnedId}
              onRemove={removeItem}
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
            {selectedItem ? (
              <ResultPanel
                key={selectedItem.id}
                item={selectedItem}
                settings={settings}
                onSettingsChange={setSettings}
              />
            ) : (
              <div className="text-muted-foreground flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed text-sm">
                Processing… results will appear here.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
