"use client";

import { Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ListHeaderProps {
  title: string;
  /** Shown in brackets after the title. Omit where the count adds nothing. */
  count?: number;
  onClear: () => void;
  /** The bin icon, for the queue where Clear throws away real work. */
  showIcon?: boolean;
  className?: string;
}

/** The heading above a queue or file list, with the button that empties it. */
export function ListHeader({
  title,
  count,
  onClear,
  showIcon = false,
  className,
}: ListHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <h2 className="text-sm font-medium">
        {title}
        {count !== undefined && (
          <span className="text-muted-foreground ml-1.5 font-normal">
            ({count})
          </span>
        )}
      </h2>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="text-muted-foreground"
      >
        {showIcon && <Trash2 className="size-4" />}
        Clear
      </Button>
    </div>
  );
}

export type { ListHeaderProps };
