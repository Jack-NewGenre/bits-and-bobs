"use client";

import { CheckCircle2, Loader2, Trash2, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type ProcessStatus = "queued" | "processing" | "done" | "error";

export interface QueueListItem {
  id: string;
  name: string;
  /** Thumbnail URL — typically the result if ready, else the original. */
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
}

export function QueueList({
  items,
  selectedId,
  onSelect,
  onRemove,
}: QueueListProps) {
  return (
    <ul className="space-y-2">
      {items.map((item) => {
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
