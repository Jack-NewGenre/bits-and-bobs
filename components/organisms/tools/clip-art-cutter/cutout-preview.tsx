"use client";

import { useEffect, useRef } from "react";
import { Download, X } from "lucide-react";

import { paintCutout, type BackdropRemoval } from "@/lib/image/cutout";
import type { Cut } from "@/lib/image/lasso";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/atoms/icon-button";

interface CutoutPreviewProps {
  image: CanvasImageSource;
  rect: Cut;
  number: number;
  removal?: BackdropRemoval;
  selected: boolean;
  onSelect: () => void;
  onDownload: () => void;
  onRemove: () => void;
}

/** Thumbnails are drawn no larger than this on their longer side. */
const THUMB_SIDE = 192;

/** A thumbnail of one cut-out, with its own download and remove buttons. */
export function CutoutPreview({
  image,
  rect,
  number,
  removal,
  selected,
  onSelect,
  onDownload,
  onRemove,
}: CutoutPreviewProps) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvas.current) return;
    const scale = Math.min(1, THUMB_SIDE / Math.max(rect.width, rect.height));
    canvas.current.width = Math.max(1, Math.round(rect.width * scale));
    canvas.current.height = Math.max(1, Math.round(rect.height * scale));
    paintCutout(canvas.current, image, rect, removal);
  }, [image, rect, removal]);

  return (
    <li
      className={cn(
        "bg-card space-y-2 rounded-lg border p-2",
        selected && "border-primary ring-primary/30 ring-2",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Select piece ${number}`}
        className="bg-checkerboard flex aspect-square w-full items-center justify-center overflow-hidden rounded-md"
      >
        <canvas ref={canvas} className="max-h-full max-w-full object-contain" />
      </button>
      <div className="flex items-center justify-between gap-1">
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {number} · {rect.width}×{rect.height}
        </span>
        <span className="flex">
          <IconButton
            icon={Download}
            label={`Download piece ${number}`}
            size="icon-xs"
            onClick={onDownload}
          />
          <IconButton
            icon={X}
            label={`Remove piece ${number}`}
            size="icon-xs"
            onClick={onRemove}
          />
        </span>
      </div>
    </li>
  );
}

export type { CutoutPreviewProps };
