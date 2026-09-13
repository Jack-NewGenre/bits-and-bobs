"use client";

import { useLiveResult } from "@/hooks/use-live-result";
import type { ImageQueueItem } from "@/hooks/use-image-queue";
import { formatHex, formatOklch } from "@/lib/colour/colour-format";
import {
  DEFAULT_PALETTE_SETTINGS,
  extractPalette,
  MAX_SWATCHES,
  MIN_SWATCHES,
  type PaletteResult,
  type PaletteSettings,
} from "@/lib/colour/palette";
import type { PaletteEntry } from "@/lib/image/quantise";
import { shallowEqual } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ColourSwatch } from "@/components/atoms/colour-swatch";
import { CopyButton } from "@/components/atoms/copy-button";
import { PreviewImage } from "@/components/atoms/preview-image";
import { ResultError } from "@/components/atoms/result-error";
import { SliderRow } from "@/components/atoms/slider-row";

const extract = (
  file: File,
  settings: PaletteSettings,
  { signal }: { signal: AbortSignal },
) => extractPalette(file, settings, { signal });

/** A Tailwind v4 `@theme` block naming each swatch by its rank. */
export function toThemeBlock(entries: PaletteEntry[]): string {
  const lines = entries.map(
    (entry, index) =>
      `  --color-swatch-${index + 1}: ${formatOklch(entry.colour)};`,
  );
  return `@theme {\n${lines.join("\n")}\n}`;
}

interface PaletteResultPanelProps {
  item: ImageQueueItem<PaletteResult>;
  settings: PaletteSettings;
  onSettingsChange: (settings: PaletteSettings) => void;
}

export function PaletteResultPanel({
  item,
  settings,
  onSettingsChange,
}: PaletteResultPanelProps) {
  const palette = useLiveResult({
    source: item.file,
    settings,
    process: extract,
    seed: {
      result: item.result,
      url: item.resultUrl,
      matches: shallowEqual(settings, DEFAULT_PALETTE_SETTINGS),
    },
    debounceMs: 120,
  });
  const entries = palette.result?.entries ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate text-base">{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <PreviewImage src={item.originalUrl} className="max-h-64" />

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {entries.map((entry, index) => (
            <ColourSwatch
              key={`${formatHex(entry.colour)}-${index}`}
              colour={entry.colour}
              caption={`${Math.round(entry.share * 100)}%`}
            />
          ))}
        </div>

        {palette.error && <ResultError message={palette.error} />}

        <SliderRow
          label="Swatches"
          value={settings.count}
          min={MIN_SWATCHES}
          max={MAX_SWATCHES}
          onChange={(count) => onSettingsChange({ count })}
        />
        <p className="text-muted-foreground text-xs">
          Each percentage is the share of the image that colour actually
          covers, so the first swatch is the one you see most of.
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <CopyButton
          value={() => entries.map((entry) => formatHex(entry.colour)).join("\n")}
          label="Copy hex"
          size="default"
          className="flex-1"
          disabled={entries.length === 0}
        />
        <CopyButton
          value={() => toThemeBlock(entries)}
          label="Copy theme"
          size="default"
          className="flex-1"
          disabled={entries.length === 0}
        />
      </CardFooter>
    </Card>
  );
}
