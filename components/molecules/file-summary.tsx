"use client";

import { extensionForType } from "@/lib/download";
import { cn, formatBytes } from "@/lib/utils";

interface FileSummaryProps {
  label: string;
  /** Omitted while the file is still being measured. */
  width?: number;
  height?: number;
  /** MIME type; rendered as a short extension. */
  type?: string;
  bytes?: number;
  /** Extra facts appended after the standard ones, e.g. "14 paths". */
  extra?: string;
  className?: string;
}

/**
 * One line of plain facts about an image: its size on screen, its format and
 * its weight. Shown for both the input and the output so the effect of a tool
 * is legible without having to check the file afterwards.
 */
export function FileSummary({
  label,
  width,
  height,
  type,
  bytes,
  extra,
  className,
}: FileSummaryProps) {
  const parts = [
    width && height ? `${width} × ${height}` : undefined,
    type ? extensionForType(type).toUpperCase() : undefined,
    bytes === undefined ? undefined : formatBytes(bytes),
    extra,
  ].filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <p className={cn("text-muted-foreground text-xs", className)}>
      {label}: {parts.join(" · ")}
    </p>
  );
}
