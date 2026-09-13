"use client";

import { ChevronDown, ChevronUp, FileText, Trash2, TriangleAlert } from "lucide-react";

import type { PdfFile } from "@/hooks/use-pdf-files";
import { cn, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PdfFileListProps {
  files: PdfFile[];
  onRemove: (id: string) => void;
  /** Omit to hide the reorder controls, where order does not matter. */
  onMove?: (id: string, direction: -1 | 1) => void;
  className?: string;
}

export function PdfFileList({
  files,
  onRemove,
  onMove,
  className,
}: PdfFileListProps) {
  return (
    <ul className={cn("space-y-2", className)}>
      {files.map((entry, index) => (
        <li
          key={entry.id}
          className={cn(
            "flex items-center gap-3 rounded-lg border p-2.5",
            entry.error && "border-destructive/40",
          )}
        >
          <FileText className="text-muted-foreground size-5 shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{entry.name}</p>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              {entry.error ? (
                <>
                  <TriangleAlert className="text-destructive size-3.5 shrink-0" />
                  {entry.error}
                </>
              ) : entry.info ? (
                <>
                  {entry.info.pageCount}{" "}
                  {entry.info.pageCount === 1 ? "page" : "pages"} ·{" "}
                  {formatBytes(entry.file.size)}
                </>
              ) : (
                "Reading…"
              )}
            </p>
          </div>

          {onMove && files.length > 1 && (
            <div className="flex shrink-0 flex-col">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${entry.name} up`}
                disabled={index === 0}
                onClick={() => onMove(entry.id, -1)}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${entry.name} down`}
                disabled={index === files.length - 1}
                onClick={() => onMove(entry.id, 1)}
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label={`Remove ${entry.name}`}
            onClick={() => onRemove(entry.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
