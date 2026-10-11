"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconButton } from "@/components/atoms/icon-button";

interface FloatingPanelProps {
  title: string;
  onClose: () => void;
  /** Shown beside the title, e.g. a layer count. */
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A closable panel that floats over the workspace, like a Photoshop palette. */
export function FloatingPanel({
  title,
  onClose,
  meta,
  children,
  className,
}: FloatingPanelProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "bg-card/95 supports-[backdrop-filter]:bg-card/85 pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-xl border shadow-lg backdrop-blur",
        className,
      )}
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b pr-1 pl-3">
        <h2 className="text-[11px] font-semibold tracking-wider uppercase">
          {title}
        </h2>
        {meta && (
          <span className="text-muted-foreground text-[11px] tabular-nums">
            {meta}
          </span>
        )}
        <IconButton
          icon={X}
          label={`Close ${title.toLowerCase()}`}
          size="icon-xs"
          side="left"
          onClick={onClose}
          className="ml-auto"
        />
      </header>
      {/* Radix sizes its content box like a table, which grows to fit long names
          instead of truncating them; a block box keeps it to the panel's width. */}
      <ScrollArea className="min-h-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:block!">
        <div className="space-y-4 p-3">{children}</div>
      </ScrollArea>
    </section>
  );
}
