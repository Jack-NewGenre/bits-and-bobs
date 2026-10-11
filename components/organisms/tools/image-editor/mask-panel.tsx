"use client";

import { Button } from "@/components/ui/button";

interface MaskPanelProps {
  masked: boolean;
  clipped: boolean;
  /** True when the add will use the current selection rather than show everything. */
  fromSelection: boolean;
  onAddMask: () => void;
  onApplyMask: () => void;
  onDeleteMask: () => void;
  onToggleClipping: () => void;
}

/**
 * The selected layer's mask and clipping. A mask hides part of a layer
 * without losing it; clipping shows the layer only where the one below has
 * pixels.
 */
export function MaskPanel({
  masked,
  clipped,
  fromSelection,
  onAddMask,
  onApplyMask,
  onDeleteMask,
  onToggleClipping,
}: MaskPanelProps) {
  return (
    <section aria-label="Mask" className="space-y-3">
      <h2 className="text-xs font-medium">Mask</h2>
      {masked ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={onApplyMask}>
            Apply
          </Button>
          <Button variant="outline" size="sm" onClick={onDeleteMask}>
            Delete
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onAddMask}
        >
          {fromSelection ? "Mask to selection" : "Add layer mask"}
        </Button>
      )}
      <Button
        variant={clipped ? "secondary" : "outline"}
        size="sm"
        className="w-full"
        aria-pressed={clipped}
        onClick={onToggleClipping}
      >
        {clipped ? "Release clipping mask" : "Clip to layer below"}
      </Button>
    </section>
  );
}
