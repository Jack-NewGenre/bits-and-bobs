"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { useVectorizedResult } from "@/hooks/use-vectorized-result";
import type { ImageQueueItem } from "@/hooks/use-image-queue";
import type { VectorizeSettings } from "@/lib/vectorize";
import { countSvgPaths } from "@/lib/vectorize";
import { downloadBlob, withSuffix } from "@/lib/download";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BeforeAfterSlider } from "@/components/shared/before-after-slider";
import { CopyButton } from "@/components/shared/copy-button";
import { ZoomControl } from "@/components/shared/zoom-control";
import { VectorizeOptions } from "@/components/tools/png-to-svg/vectorize-options";

interface VectorizeResultPanelProps {
  item: ImageQueueItem;
  settings: VectorizeSettings;
  onSettingsChange: (settings: VectorizeSettings) => void;
}

export function VectorizeResultPanel({
  item,
  settings,
  onSettingsChange,
}: VectorizeResultPanelProps) {
  const [zoom, setZoom] = useState(1);
  const vectorized = useVectorizedResult(item.file, settings);
  const previewUrl = vectorized.url ?? item.resultUrl;
  const { svg, blob } = vectorized;

  const handleDownload = () => {
    if (!blob) return;
    downloadBlob(blob, withSuffix(item.name, "", "svg"));
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
              afterLabel="Vector"
              zoom={zoom}
            />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Drag to compare · zoom in to inspect the traced paths
              </span>
              <ZoomControl zoom={zoom} onZoomChange={setZoom} />
            </div>
          </div>
        )}
        {svg && blob && (
          <p className="text-muted-foreground text-xs">
            Output: SVG · {countSvgPaths(svg)} paths · {formatBytes(blob.size)}
          </p>
        )}
        <VectorizeOptions settings={settings} onChange={onSettingsChange} />
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          type="button"
          onClick={handleDownload}
          disabled={!blob || vectorized.isProcessing}
          className="flex-1"
        >
          {vectorized.isProcessing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download SVG
        </Button>
        <CopyButton
          value={() => svg ?? ""}
          label="Copy SVG"
          size="default"
          disabled={!svg || vectorized.isProcessing}
        />
      </CardFooter>
    </Card>
  );
}
