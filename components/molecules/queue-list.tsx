"use client";

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type ProcessStatus = "queued" | "processing" | "done" | "error";

export interface QueueListItem {
  id: string;
  name: string;
  /** Thumbnail URL, typically the result if ready, else the original. */
  previewUrl: string;
  status: ProcessStatus;
  /** Human-readable label for the current status. */
  statusLabel: string;
  /** 0–1 progress for the processing stage. */
  progress: number;
  error?: string;
  /** Render a checkerboard behind the thumbnail (for transparent results). */
  transparent?: boolean;
}

interface QueueListProps {
  items: QueueListItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  /** Re-run a failed item. Omit to hide the retry action. */
  onRetry?: (id: string) => void;
  /** Reorder. Omit where the queue's order does not affect the output. */
  onMove?: (id: string, direction: -1 | 1) => void;
  className?: string;
}

export function QueueList({
  items,
  selectedId,
  onSelect,
  onRemove,
  onRetry,
  onMove,
  className,
}: QueueListProps) {
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item, index) => {
        const isBusy = item.status === "processing" || item.status === "queued";

        return (
          <li key={item.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => item.status === "done" && onSelect(item.id)}
              onKeyDown={(event) => {
                if (
                  item.status === "done" &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  onSelect(item.id);
                }
              }}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors",
                item.status === "done" && "cursor-pointer hover:bg-accent/50",
                selectedId === item.id && "border-primary bg-accent/50",
              )}
            >
              <div
                className={cn(
                  "size-10 shrink-0 overflow-hidden rounded",
                  item.transparent && "bg-checkerboard",
                )}
              >
                <img
                  src={item.previewUrl}
                  alt=""
                  className="size-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                  {item.status === "done" && (
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                  )}
                  {item.status === "error" && (
                    <TriangleAlert className="text-destructive size-3.5" />
                  )}
                  {isBusy && <Loader2 className="size-3.5 animate-spin" />}
                  <span className="truncate">
                    {item.error ?? item.statusLabel}
                  </span>
                </div>
                {item.status === "processing" && (
                  <Progress
                    value={Math.round(item.progress * 100)}
                    className="mt-1.5 h-1"
                  />
                )}
              </div>

              {onMove && items.length > 1 && (
                <div className="flex shrink-0 flex-col">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${item.name} up`}
                    disabled={index === 0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onMove(item.id, -1);
                    }}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move ${item.name} down`}
                    disabled={index === items.length - 1}
                    onClick={(event) => {
                      event.stopPropagation();
                      onMove(item.id, 1);
                    }}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
              )}

              {onRetry && item.status === "error" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label={`Retry ${item.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRetry(item.id);
                  }}
                >
                  <RotateCw className="size-4" />
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label={`Remove ${item.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(item.id);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
