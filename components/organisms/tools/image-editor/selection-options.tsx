"use client";

import type { MaskMode } from "@/lib/image/editor/pixels";
import type { EditorTool } from "@/lib/image/editor/shortcuts";
import type {
  LassoKind,
  MarqueeShape,
  ToolStyle,
} from "@/lib/image/editor/tool-style";
import { Button } from "@/components/ui/button";
import { SliderRow } from "@/components/atoms/slider-row";
import { OptionGroup } from "@/components/molecules/option-group";

const MODES: readonly { value: MaskMode; label: string }[] = [
  { value: "replace", label: "New" },
  { value: "add", label: "Add" },
  { value: "subtract", label: "Subtract" },
];

const MARQUEES: readonly { value: MarqueeShape; label: string }[] = [
  { value: "rect", label: "Rectangle" },
  { value: "ellipse", label: "Ellipse" },
];

const LASSOS: readonly { value: LassoKind; label: string }[] = [
  { value: "freehand", label: "Freehand" },
  { value: "magnetic", label: "Magnetic" },
];

interface SelectionOptionsProps {
  tool: EditorTool;
  style: ToolStyle;
  onChange: (patch: Partial<ToolStyle>) => void;
  hasSelection: boolean;
  onSelectAll: () => void;
  onInvert: () => void;
  onDeselect: () => void;
}

/** Settings for the marquee, lasso and magic wand, and the selection itself. */
export function SelectionOptions({
  tool,
  style,
  onChange,
  hasSelection,
  onSelectAll,
  onInvert,
  onDeselect,
}: SelectionOptionsProps) {
  return (
    <>
      {tool === "marquee" && (
        <OptionGroup
          label="Shape"
          choices={MARQUEES}
          value={style.marquee}
          onChange={(marquee) => onChange({ marquee })}
        />
      )}
      {tool === "lasso" && (
        <OptionGroup
          label="Kind"
          choices={LASSOS}
          value={style.lasso}
          onChange={(lasso) => onChange({ lasso })}
          hint={
            style.lasso === "magnetic"
              ? "Click on an edge, then trace along it. Click to add a point, Backspace removes one, Enter or a double-click closes it."
              : undefined
          }
        />
      )}
      <OptionGroup
        label="Selection"
        choices={MODES}
        value={style.selectionMode}
        onChange={(selectionMode) => onChange({ selectionMode })}
      />
      {tool === "wand" && (
        <SliderRow
          label="Tolerance"
          value={style.tolerance}
          min={0}
          max={255}
          onChange={(tolerance) => onChange({ tolerance })}
        />
      )}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" onClick={onSelectAll}>
          All
        </Button>
        <Button variant="outline" size="sm" onClick={onInvert}>
          Invert
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDeselect}
          disabled={!hasSelection}
        >
          None
        </Button>
      </div>
    </>
  );
}
