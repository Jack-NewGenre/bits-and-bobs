"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  useImageQueue,
  type DoneQueueItem,
  type QueueOutput,
} from "@/hooks/use-image-queue";
import {
  DEFAULT_IMAGES_TO_PDF,
  imagesToPdf,
  MAX_MARGIN,
  PAGE_SIZES,
  type ImagesToPdfSettings,
  type Orientation,
  type PageSizeId,
} from "@/lib/pdf/pdf-edit";
import { DEFAULT_TRANSFORM_SETTINGS, transformImage } from "@/lib/image/transform";
import { downloadBlob } from "@/lib/download";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ImageDropzone } from "@/components/molecules/image-dropzone";
import { PillButton } from "@/components/atoms/pill-button";
import { QueueList } from "@/components/molecules/queue-list";
import { SliderRow } from "@/components/atoms/slider-row";
import { DownloadButton } from "@/components/atoms/download-button";
import { OptionGroup } from "@/components/molecules/option-group";
import { ListHeader } from "@/components/molecules/list-header";

const STATUS_LABEL = {
  queued: "Queued",
  processing: "Reading…",
  done: "Ready",
  error: "Failed",
} as const;

const ORIENTATIONS: { value: Orientation; label: string }[] = [
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];

/**
 * A PDF can only carry JPEG and PNG natively, so anything else (WebP, most
 * commonly) is re-encoded to PNG on the way in rather than rejected.
 */
const prepare = (file: File) =>
  file.type === "image/jpeg" || file.type === "image/png"
    ? Promise.resolve({ blob: file })
    : transformImage(file, {
        ...DEFAULT_TRANSFORM_SETTINGS,
        format: "image/png",
      }).then(({ blob }) => ({ blob }));

const PAGE_SIZE_CHOICES = (Object.keys(PAGE_SIZES) as PageSizeId[]).map((id) => ({
  value: id,
  label: PAGE_SIZES[id].label,
}));

export function ImagesToPdfTool() {
  const { items, addFiles, removeItem, moveItem, clear } =
    useImageQueue(prepare);
  const [settings, setSettings] = useState<ImagesToPdfSettings>(
    DEFAULT_IMAGES_TO_PDF,
  );
  const [isBuilding, setIsBuilding] = useState(false);

  // Narrowed rather than asserted: a done item always carries its result,
  // and saying so in the type is what lets the build check it.
  const ready = items.filter(
    (item): item is DoneQueueItem<QueueOutput> =>
      item.status === "done" && item.result !== undefined,
  );

  const set = <K extends keyof ImagesToPdfSettings>(
    key: K,
    value: ImagesToPdfSettings[K],
  ) => setSettings((prev) => ({ ...prev, [key]: value }));

  const handleBuild = async () => {
    if (ready.length === 0) return;
    setIsBuilding(true);
    try {
      const pages = ready.map(
        (item) =>
          new File([item.result.blob], item.name, {
            type: item.result.blob.type,
          }),
      );
      downloadBlob(await imagesToPdf(pages, settings), "images.pdf");
      toast.success(`Built a ${pages.length}-page PDF`);
    } catch {
      toast.error("Could not build the PDF");
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="space-y-6">
      <ImageDropzone
        onFiles={addFiles}
        onReject={() => toast.error("Only PNG, JPG and WebP can be used")}
        hint="PNG, JPG or WebP · one image per page, in the order dropped"
      />

      {items.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card>
            <CardContent className="space-y-3">
              <ListHeader
                title="Pages"
                count={items.length}
                onClear={clear}
              />

              <QueueList
                items={items.map((item) => ({
                  id: item.id,
                  name: item.name,
                  previewUrl: item.originalUrl,
                  status: item.status,
                  statusLabel: STATUS_LABEL[item.status],
                  progress: item.progress,
                  error: item.error,
                }))}
                selectedId={undefined}
                onSelect={() => {}}
                onRemove={removeItem}
                onMove={moveItem}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-5">
              <OptionGroup
                label="Page size"
                choices={PAGE_SIZE_CHOICES}
                value={settings.pageSize}
                onChange={(id) => set("pageSize", id)}
                columns={3}
                hint={
                  settings.pageSize === "fit"
                    ? "Each page takes the shape of its own image, so nothing is letterboxed."
                    : undefined
                }
              />

              {settings.pageSize !== "fit" && (
                <div className="space-y-2">
                  <Label className="text-xs">Orientation</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ORIENTATIONS.map(({ value, label }) => (
                      <PillButton
                        key={value}
                        active={settings.orientation === value}
                        ariaPressed={settings.orientation === value}
                        onClick={() => set("orientation", value)}
                      >
                        {label}
                      </PillButton>
                    ))}
                  </div>
                </div>
              )}

              <SliderRow
                label="Margin (points)"
                value={settings.margin}
                min={0}
                max={MAX_MARGIN}
                onChange={(margin) => set("margin", margin)}
              />

              <DownloadButton
                onClick={handleBuild}
                busy={isBuilding}
                disabled={ready.length === 0 || isBuilding}
                className="w-full"
                label={`Build a ${ready.length}-page PDF`}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
