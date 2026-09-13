"use client";

import type { TrimResult } from "@/lib/image/trim";
import { cn } from "@/lib/utils";

interface CropPreviewProps {
  src: string;
  result?: TrimResult;
  isStale?: boolean;
}

/**
 * The original image with the crop drawn on it.
 *
 * A before/after slider is the wrong shape for a crop: the output is a
 * different size, so it renders magnified to fill the same box and the two
 * halves never line up, which reads as a zoom rather than a trim. Showing
 * where the cut falls answers the actual question.
 *
 * The frame is given the source's aspect ratio so the image fills it exactly,
 * which lets the overlay be positioned as plain percentages of the original.
 */
export function CropPreview({ src, result, isStale }: CropPreviewProps) {
  const ratio = result
    ? `${result.sourceWidth} / ${result.sourceHeight}`
    : undefined;

  const box = result && {
    left: `${(result.bounds.left / result.sourceWidth) * 100}%`,
    top: `${(result.bounds.top / result.sourceHeight) * 100}%`,
    width: `${(result.bounds.width / result.sourceWidth) * 100}%`,
    height: `${(result.bounds.height / result.sourceHeight) * 100}%`,
  };

  return (
    <div
      style={{ aspectRatio: ratio }}
      className={cn(
        "bg-checkerboard relative w-full overflow-hidden rounded-lg transition-opacity",
        !ratio && "aspect-video",
        isStale && "opacity-60",
      )}
    >
      <img src={src} alt="" className="size-full object-fill" />

      {box && result?.trimmed && (
        // An outward-spreading shadow dims everything outside the crop in one
        // pass, so the kept region keeps its own checkerboard rather than
        // sitting on top of a dimming layer that reads as solid black.
        <div
          style={box}
          className="border-primary bg-checkerboard absolute overflow-hidden border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
        >
          <img
            src={src}
            alt=""
            className="absolute max-w-none object-fill"
            style={{
              width: `${(result.sourceWidth / result.bounds.width) * 100}%`,
              height: `${(result.sourceHeight / result.bounds.height) * 100}%`,
              left: `${(-result.bounds.left / result.bounds.width) * 100}%`,
              top: `${(-result.bounds.top / result.bounds.height) * 100}%`,
            }}
          />
        </div>
      )}

      <span className="bg-background/80 pointer-events-none absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-xs font-medium">
        {result?.trimmed ? `Keeping ${result.width} × ${result.height}` : "Original"}
      </span>
    </div>
  );
}
