"use client";

import { Frame, History, ImagePlus, Type } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyCanvasCardProps {
  onNewCanvas: () => void;
  onAddImage: () => void;
  onAddText: () => void;
  /** The name of work autosaved in this browser last time, if there is any. */
  savedName?: string;
  onRestore?: () => void;
  onDiscard?: () => void;
}

/**
 * The first thing on a blank canvas: a way in, a reminder of drop and paste,
 * and the last session's work if it was left unfinished.
 */
export function EmptyCanvasCard({
  onNewCanvas,
  onAddImage,
  onAddText,
  savedName,
  onRestore,
  onDiscard,
}: EmptyCanvasCardProps) {
  const actions = [
    { label: "New canvas", icon: Frame, run: onNewCanvas },
    { label: "Add image", icon: ImagePlus, run: onAddImage },
    { label: "Add text", icon: Type, run: onAddText },
  ];

  return (
    <div className="bg-card pointer-events-auto w-96 overflow-hidden rounded-xl border shadow-lg">
      {savedName !== undefined && (
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <History className="text-muted-foreground size-4 shrink-0" />
          <p className="min-w-0 flex-1 truncate text-xs">
            Pick up <span className="font-medium">{savedName}</span> where you
            left off?
          </p>
          <Button variant="ghost" size="sm" onClick={onDiscard}>
            Discard
          </Button>
          <Button size="sm" onClick={onRestore}>
            Restore
          </Button>
        </div>
      )}
      <div className="grid grid-cols-3 divide-x">
        {actions.map(({ label, icon: Icon, run }) => (
          <button
            key={label}
            type="button"
            onClick={run}
            className="hover:bg-muted focus-visible:bg-muted flex flex-col items-center gap-2 py-5 text-xs font-medium outline-none"
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground border-t px-3 py-2 text-center text-xs">
        Or drop an image here, or paste one.
      </p>
    </div>
  );
}
