"use client";

import type { PointerEvent } from "react";

import type { Corner } from "@/lib/image/square-crop";
import { cn } from "@/lib/utils";

interface CornerHandleProps {
  corner: Corner;
  onPointerDown: (event: PointerEvent<HTMLSpanElement>) => void;
  className?: string;
}

const POSITION: Record<Corner, string> = {
  nw: "-top-1.5 -left-1.5 cursor-nwse-resize",
  ne: "-top-1.5 -right-1.5 cursor-nesw-resize",
  sw: "-bottom-1.5 -left-1.5 cursor-nesw-resize",
  se: "-right-1.5 -bottom-1.5 cursor-nwse-resize",
};

/** A small square on a box's corner, dragged to resize the box. */
export function CornerHandle({
  corner,
  onPointerDown,
  className,
}: CornerHandleProps) {
  return (
    <span
      data-corner={corner}
      onPointerDown={onPointerDown}
      className={cn(
        "border-primary bg-background absolute size-3 rounded-sm border-2",
        POSITION[corner],
        className,
      )}
    />
  );
}

export type { CornerHandleProps };
