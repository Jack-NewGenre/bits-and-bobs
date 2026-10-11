"use client";

import { useState } from "react";
import { ImageUp } from "lucide-react";
import { toast } from "sonner";

import type { Rgb } from "@/lib/colour/colour";
import { formatHex, formatRgb } from "@/lib/colour/colour-format";
import { rejectionMessage } from "@/lib/image/file-intake";
import {
  decodePixels,
  sampleAverage,
  SAMPLE_SIZES,
  type PixelSource,
  type SampleSize,
} from "@/lib/image/pixel-sample";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ColourSwatch } from "@/components/atoms/colour-swatch";
import { CopyButton } from "@/components/atoms/copy-button";
import { ImageDropzone } from "@/components/molecules/image-dropzone";
import { ListHeader } from "@/components/molecules/list-header";
import { OptionGroup } from "@/components/molecules/option-group";
import {
  PixelPickerCanvas,
  type Point,
} from "@/components/organisms/tools/pixel-picker/pixel-picker-canvas";

const MAX_SWATCHES = 24;

const SIZE_CHOICES = SAMPLE_SIZES.map((size) => ({
  value: size,
  label: size === 1 ? "1 px" : `${size}×${size}`,
}));

export function PixelPickerTool() {
  const [source, setSource] = useState<
    (PixelSource & { bitmap: ImageBitmap }) | null
  >(null);
  const [sampleSize, setSampleSize] = useState<SampleSize>(1);
  const [hovered, setHovered] = useState<Rgb | null>(null);
  const [swatches, setSwatches] = useState<Rgb[]>([]);
  // A fresh canvas per image, so the loupe never points at the old one.
  const [loads, setLoads] = useState(0);

  const load = async ([file]: File[]) => {
    try {
      setSource(await decodePixels(file));
      setLoads((count) => count + 1);
      setHovered(null);
    } catch {
      toast.error(`Could not read ${file.name}`);
    }
  };

  if (!source) {
    return (
      <ImageDropzone
        single
        onFiles={load}
        onReject={(rejected) => toast.error(rejectionMessage(rejected))}
        prompt="Drop an image here, paste, or click to browse"
        hint="PNG, JPG or WebP · up to 25MB · it never leaves your device"
      />
    );
  }

  const sample = ({ x, y }: Point) => sampleAverage(source, x, y, sampleSize);
  const pick = (point: Point) =>
    setSwatches((current) =>
      [sample(point), ...current].slice(0, MAX_SWATCHES),
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card>
        <CardContent className="space-y-4">
          <PixelPickerCanvas
            key={loads}
            source={source}
            onHover={(point) => setHovered(sample(point))}
            onPick={pick}
          />
          <div className="flex flex-wrap items-end gap-4">
            <OptionGroup
              label="Sample"
              choices={SIZE_CHOICES}
              value={sampleSize}
              onChange={setSampleSize}
              columns={4}
              className="min-w-64 flex-1"
            />
            <Button variant="outline" onClick={() => setSource(null)}>
              <ImageUp />
              New image
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="size-12 shrink-0 rounded-lg border"
              style={{
                backgroundColor: hovered ? formatHex(hovered) : undefined,
              }}
            />
            <div className="min-w-0 font-mono text-sm">
              {hovered ? (
                <>
                  <p>{formatHex(hovered)}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {formatRgb(hovered)}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground font-sans">
                  Hover the image, then click to keep a colour.
                </p>
              )}
            </div>
          </div>

          {swatches.length > 0 && (
            <>
              <ListHeader
                title="Picked"
                count={swatches.length}
                onClear={() => setSwatches([])}
              />
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {swatches.map((colour, index) => (
                  <ColourSwatch
                    key={`${formatHex(colour)}-${index}`}
                    colour={colour}
                    caption={formatHex(colour)}
                  />
                ))}
              </div>
              <CopyButton
                value={() =>
                  swatches.map((colour) => formatHex(colour)).join("\n")
                }
                label="Copy all"
                size="default"
                className="w-full"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
