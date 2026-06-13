"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { useEnhancedResult } from "@/hooks/use-enhanced-result";
import type { ImageQueueItem } from "@/hooks/use-image-queue";
import type { EnhanceSettings } from "@/lib/enhance";
import { downloadBlob, extensionForType, withSuffix } from "@/lib/download";
import { cn, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BeforeAfterSlider } from "@/components/shared/before-after-slider";
import { EnhanceOptions } from "@/components/tools/image-enhancer/enhance-options";

const ZOOM_LEVELS = [1, 2, 4];

interface EnhanceResultPanelProps {
  item: ImageQueueItem;
  settings: EnhanceSettings;
  onSettingsChange: (settings: EnhanceSettings) => void;
}

export function EnhanceResultPanel({
  item,
  settings,
  onSettingsChange,
}: EnhanceResultPanelProps) {
  const [zoom, setZoom] = useState(1);
  const enhanced = useEnhancedResult(item.file, settings);
  const previewUrl = enhanced.url ?? item.resultUrl;
  const blob = enhanced.blob;

  const handleDownload = () => {
    if (!blob) return;
    downloadBlob(
      blob,
      withSuffix(item.name, "-enhanced", extensionForType(blob.type)),
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate text-base">{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {previewUrl && (
          <div className="space-y-2">
            <BeforeAfterSlider
              beforeUrl={item.originalUrl}
              afterUrl={previewUrl}
              beforeLabel="Original"
              afterLabel="Enhanced"
              zoom={zoom}
            />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Drag to compare · zoom in to inspect detail
              </span>
              <div className="flex gap-1">
                {ZOOM_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={zoom === level}
                    onClick={() => setZoom(level)}
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                      zoom === level
                        ? "border-primary bg-accent"
                        : "hover:bg-accent/50",
                    )}
                  >
                    {level === 1 ? "Fit" : `${level}×`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {blob && (
          <p className="text-muted-foreground text-xs">
            Output: {settings.scale}× ·{" "}
            {extensionForType(blob.type).toUpperCase()} · {formatBytes(blob.size)}
          </p>
        )}
        <EnhanceOptions settings={settings} onChange={onSettingsChange} />
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          onClick={handleDownload}
          disabled={!blob || enhanced.isProcessing}
          className="w-full"
        >
          {enhanced.isProcessing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download
        </Button>
      </CardFooter>
    </Card>
  );
}
