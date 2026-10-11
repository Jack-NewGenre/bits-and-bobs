"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";

import type { LayerSummary } from "@/lib/image/editor/layers";
import { IconButton } from "@/components/atoms/icon-button";
import { LayerRow } from "@/components/organisms/tools/image-editor/layer-row";

interface LayersPanelProps {
  layers: LayerSummary[];
  /** Previews keyed by layer id; a layer without one shows its kind icon. */
  thumbnails?: Readonly<Record<string, string>>;
  onSelect: (id: string, additive: boolean) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onRename: (id: string, name: string) => void;
  /** `index` counts from the top of the list. */
  onMove: (id: string, index: number) => void;
  onArrange: (direction: "forward" | "backward") => void;
  onCreate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/** The layer stack, top first, with drag to reorder. */
export function LayersPanel({
  layers,
  thumbnails,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onRename,
  onMove,
  onArrange,
  onCreate,
  onDuplicate,
  onDelete,
}: LayersPanelProps) {
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const hasSelection = layers.some((layer) => layer.selected);

  return (
    <div className="space-y-2">
      <div className="-mt-1 flex justify-end">
        <div className="flex">
          <IconButton
            icon={Plus}
            label="New layer"
            size="icon-xs"
            onClick={onCreate}
          />
          <IconButton
            icon={ArrowUp}
            label="Bring forward"
            shortcut="⌘]"
            size="icon-xs"
            disabled={!hasSelection}
            onClick={() => onArrange("forward")}
          />
          <IconButton
            icon={ArrowDown}
            label="Send backward"
            shortcut="⌘["
            size="icon-xs"
            disabled={!hasSelection}
            onClick={() => onArrange("backward")}
          />
          <IconButton
            icon={Copy}
            label="Duplicate"
            shortcut="⌘D"
            size="icon-xs"
            disabled={!hasSelection}
            onClick={onDuplicate}
          />
          <IconButton
            icon={Trash2}
            label="Delete"
            shortcut="⌫"
            size="icon-xs"
            disabled={!hasSelection}
            onClick={onDelete}
          />
        </div>
      </div>
      {layers.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-3 text-center text-xs">
          No layers yet. Draw, add text or a shape, or drop in an image.
        </p>
      ) : (
        <ul className="space-y-0.5" onDragEnd={() => setOver(null)}>
          {layers.map((layer, index) => (
            <LayerRow
              key={layer.id}
              layer={layer}
              thumbnail={thumbnails?.[layer.id]}
              dropTarget={over === index && dragged !== layer.id}
              onSelect={(additive) => onSelect(layer.id, additive)}
              onToggleVisible={() => onToggleVisible(layer.id)}
              onToggleLocked={() => onToggleLocked(layer.id)}
              onRename={(name) => onRename(layer.id, name)}
              onDragStart={() => setDragged(layer.id)}
              onDragOver={() => setOver(index)}
              onDrop={() => {
                if (dragged && dragged !== layer.id) onMove(dragged, index);
                setDragged(null);
                setOver(null);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
