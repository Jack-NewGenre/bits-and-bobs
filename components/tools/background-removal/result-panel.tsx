"use client";

import { Download, Loader2 } from "lucide-react";

import type { QueueItem } from "@/hooks/use-bg-removal-queue";
import {
  useCompositedResult,
  type BackgroundSettings,
} from "@/hooks/use-composited-result";
import { downloadBlob, toPngName } from "@/lib/download";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BeforeAfterSlider } from "@/components/shared/before-after-slider";
import { BackgroundOptions } from "@/components/tools/background-removal/background-options";

interface ResultPanelProps {
  item: QueueItem;
  settings: BackgroundSettings;
  onSettingsChange: (settings: BackgroundSettings) => void;
}

export function ResultPanel({
  item,
  settings,
  onSettingsChange,
}: ResultPanelProps) {
  const composited = useCompositedResult(item.cutout, settings);
  const previewUrl = composited.url ?? item.cutoutUrl;

  const handleDownload = () => {
    if (!composited.blob) return;
    downloadBlob(composited.blob, toPngName(item.name));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate text-base">{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {previewUrl && (
          <BeforeAfterSlider
            beforeUrl={item.originalUrl}
            afterUrl={previewUrl}
            beforeLabel="Original"
            afterLabel="Removed"
            showCheckerboard
          />
        )}
        <BackgroundOptions settings={settings} onChange={onSettingsChange} />
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          onClick={handleDownload}
          disabled={!composited.blob || composited.isComposing}
          className="w-full"
        >
          {composited.isComposing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download PNG
        </Button>
      </CardFooter>
    </Card>
  );
}
