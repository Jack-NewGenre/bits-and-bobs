"use client";

import { useMemo, useState } from "react";
import { DownloadCloud, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  useImageQueue,
  type ImageQueueItem,
  type ImageQueueStatus,
} from "@/hooks/use-image-queue";
import {
  DEFAULT_ENHANCE_SETTINGS,
  enhanceImage,
  type EnhanceSettings,
} from "@/lib/enhance";
import { downloadZip, extensionForType, withSuffix } from "@/lib/download";
import { Button } from "@/components/ui/button";
import {
  ImageDropzone,
  type RejectedFile,
} from "@/components/shared/image-dropzone";
import { QueueList, type QueueListItem } from "@/components/shared/queue-list";
import { EnhanceResultPanel } from "@/components/tools/image-enhancer/enhance-result-panel";

const STATUS_LABEL: Record<ImageQueueStatus, string> = {
  queued: "Queued",
  processing: "Enhancing…",
  done: "Done",
  error: "Failed",
};

// Stable processor: the queue's first pass uses balanced defaults; the result
// panel then re-enhances live as the user tweaks the settings.
const enhanceWithDefaults = (
  file: File,
  onProgress: (fraction: number) => void,
) =>
  enhanceImage(file, DEFAULT_ENHANCE_SETTINGS, {
    onProgress: ({ fraction }) => onProgress(fraction),
  });

function toListItem(item: ImageQueueItem): QueueListItem {
  return {
    id: item.id,
    name: item.name,
    previewUrl: item.resultUrl ?? item.originalUrl,
    status: item.status,
    statusLabel: STATUS_LABEL[item.status],
    progress: item.progress,
    error: item.error,
  };
}

export function ImageEnhancerTool() {
  const { items, addFiles, removeItem, clear } =
    useImageQueue(enhanceWithDefaults);
  // The user's explicit choice; falls back to the first finished item.
  const [pinnedId, setPinnedId] = useState<string>();
  const [settings, setSettings] = useState<EnhanceSettings>(
    DEFAULT_ENHANCE_SETTINGS,
  );

  const doneItems = useMemo(
    () => items.filter((item) => item.status === "done"),
    [items],
  );

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
    if (doneItems.length === 0) return;
    const toastId = toast.loading(`Enhancing ${doneItems.length} images…`);
    try {
      // Re-enhance every image with the currently chosen settings.
      const entries: { name: string; blob: Blob }[] = [];
      for (const item of doneItems) {
        const blob = await enhanceImage(item.file, settings);
        entries.push({
          name: withSuffix(item.name, "-enhanced", extensionForType(blob.type)),
          blob,
        });
      }
      await downloadZip(entries, "enhanced-images.zip");
      toast.success(`Downloaded ${entries.length} images`, { id: toastId });
    } catch {
      toast.error("Could not prepare the download", { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      <ImageDropzone
        onFiles={addFiles}
        onReject={handleReject}
        hint="PNG, JPG or WebP · up to 25MB · upscaled & sharpened on your device"
      />

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
                onClick={clear}
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
              <EnhanceResultPanel
                key={selectedItem.id}
                item={selectedItem}
                settings={settings}
                onSettingsChange={setSettings}
              />
            ) : (
              <div className="text-muted-foreground flex h-full min-h-64 items-center justify-center rounded-xl border border-dashed text-sm">
                Enhancing… results will appear here.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
