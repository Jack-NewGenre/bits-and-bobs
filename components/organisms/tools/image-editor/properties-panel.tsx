"use client";

import {
  ChevronDown,
  Crosshair,
  FlipHorizontal2,
  FlipVertical2,
  RotateCcw,
  RotateCw,
} from "lucide-react";

import { BLEND_MODES } from "@/lib/image/editor/layers";
import type {
  SelectionProps,
  StylePatch,
  TransformOp,
} from "@/lib/image/editor/selection";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { IconButton } from "@/components/atoms/icon-button";
import { SliderRow } from "@/components/atoms/slider-row";
import { HexColourField } from "@/components/organisms/tools/image-editor/hex-colour-field";

const TRANSFORMS = [
  { op: "flip-x", label: "Flip horizontally", icon: FlipHorizontal2 },
  { op: "flip-y", label: "Flip vertically", icon: FlipVertical2 },
  { op: "rotate-ccw", label: "Rotate left", icon: RotateCcw },
  { op: "rotate-cw", label: "Rotate right", icon: RotateCw },
  { op: "centre", label: "Centre on canvas", icon: Crosshair },
] as const;

interface PropertiesPanelProps {
  selection: SelectionProps;
  onStyle: (patch: StylePatch) => void;
  onTransform: (op: TransformOp) => void;
}

/** Opacity, blend mode, colours and transforms for the selected layer. */
export function PropertiesPanel({
  selection,
  onStyle,
  onTransform,
}: PropertiesPanelProps) {
  const blendLabel =
    BLEND_MODES.find((mode) => mode.value === selection.blend)?.label ??
    "Normal";

  return (
    <section aria-label="Layer properties" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 truncate text-xs font-medium">
          {selection.name}
        </h2>
        <div className="flex shrink-0">
          {TRANSFORMS.map(({ op, label, icon }) => (
            <IconButton
              key={op}
              icon={icon}
              label={label}
              size="icon-xs"
              onClick={() => onTransform(op)}
            />
          ))}
        </div>
      </div>

      <SliderRow
        label="Opacity"
        value={selection.opacity}
        min={0}
        max={100}
        onChange={(opacity) => onStyle({ opacity })}
      />

      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Blend mode</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-36 justify-between"
            >
              {blendLabel}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
            <DropdownMenuRadioGroup
              value={selection.blend}
              onValueChange={(value) => {
                const mode = BLEND_MODES.find((item) => item.value === value);
                if (mode) onStyle({ blend: mode.value });
              }}
            >
              {BLEND_MODES.map((mode) => (
                <DropdownMenuRadioItem key={mode.value} value={mode.value}>
                  {mode.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selection.fontSize !== undefined && (
        <SliderRow
          label="Font size"
          value={selection.fontSize}
          min={8}
          max={400}
          onChange={(fontSize) => onStyle({ fontSize })}
        />
      )}
      {selection.fill !== undefined && (
        <HexColourField
          label={selection.kind === "text" ? "Text colour" : "Fill"}
          value={selection.fill}
          onChange={(fill) => onStyle({ fill })}
        />
      )}
      {selection.stroke !== undefined && (
        <>
          <HexColourField
            label="Stroke"
            value={selection.stroke}
            onChange={(stroke) => onStyle({ stroke })}
          />
          <SliderRow
            label="Stroke width"
            value={selection.strokeWidth ?? 0}
            min={selection.kind === "line" ? 1 : 0}
            max={100}
            onChange={(strokeWidth) => onStyle({ strokeWidth })}
          />
        </>
      )}
    </section>
  );
}
