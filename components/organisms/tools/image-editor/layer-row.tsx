"use client";

import { useState } from "react";
import {
  Brush,
  Circle,
  CornerLeftDown,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  LockOpen,
  Pentagon,
  Slash,
  Square,
  Type,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { LayerKind, LayerSummary } from "@/lib/image/editor/layers";
import { IconButton } from "@/components/atoms/icon-button";

const KIND_ICONS: Record<LayerKind, LucideIcon> = {
  image: ImageIcon,
  drawing: Brush,
  text: Type,
  rect: Square,
  ellipse: Circle,
  line: Slash,
  polygon: Pentagon,
};

interface LayerRowProps {
  layer: LayerSummary;
  /** A data URL preview of the layer; the kind icon stands in until it exists. */
  thumbnail?: string;
  dropTarget: boolean;
  onSelect: (additive: boolean) => void;
  onToggleVisible: () => void;
  onToggleLocked: () => void;
  onRename: (name: string) => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
}

/** One layer: pick it, drag it, rename it with a double click, hide or lock it. */
export function LayerRow({
  layer,
  thumbnail,
  dropTarget,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
}: LayerRowProps) {
  const [editing, setEditing] = useState(false);
  const Icon = KIND_ICONS[layer.kind];

  return (
    <li
      draggable={!editing}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      className={cn(
        "group flex items-center gap-1 rounded-md border border-transparent py-0.5 pr-0.5 pl-2",
        layer.selected ? "bg-accent border-border" : "hover:bg-muted/60",
        dropTarget && "border-t-primary",
        !layer.visible && "text-muted-foreground",
      )}
    >
      {layer.clipped && (
        <CornerLeftDown
          aria-label="Clipped to the layer below"
          className="text-muted-foreground size-3 shrink-0"
        />
      )}
      <span
        className={cn(
          "bg-checkerboard relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-sm border",
          !layer.visible && "opacity-50",
        )}
        aria-hidden
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <Icon className="text-muted-foreground size-3.5" />
        )}
      </span>
      {layer.masked && (
        <span
          title="Layer mask"
          aria-label="Has a layer mask"
          className="size-4 shrink-0 rounded-sm border bg-gradient-to-r from-white to-black"
        />
      )}
      {editing ? (
        <input
          autoFocus
          defaultValue={layer.name}
          aria-label="Layer name"
          className="bg-background min-w-0 flex-1 rounded-sm px-1 text-xs outline-none"
          onBlur={(event) => {
            onRename(event.target.value);
            setEditing(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          aria-pressed={layer.selected}
          className="min-w-0 flex-1 truncate py-1 text-left text-xs"
          onClick={(event) =>
            onSelect(event.shiftKey || event.metaKey || event.ctrlKey)
          }
          onDoubleClick={() => setEditing(true)}
        >
          {layer.name}
        </button>
      )}
      <IconButton
        icon={layer.locked ? Lock : LockOpen}
        label={layer.locked ? "Unlock layer" : "Lock layer"}
        size="icon-xs"
        side="left"
        onClick={onToggleLocked}
        className={cn(
          !layer.locked &&
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        )}
      />
      <IconButton
        icon={layer.visible ? Eye : EyeOff}
        label={layer.visible ? "Hide layer" : "Show layer"}
        size="icon-xs"
        side="left"
        onClick={onToggleVisible}
      />
    </li>
  );
}
