"use client";

import {
  MAX_SIDES,
  MIN_SIDES,
  SHAPE_KINDS,
  SHAPE_NAMES,
} from "@/lib/image/editor/shapes";
import type { EditorTool } from "@/lib/image/editor/shortcuts";
import { FONT_FAMILIES } from "@/lib/image/editor/text";
import type { ToolStyle } from "@/lib/image/editor/tool-style";
import { SliderRow } from "@/components/atoms/slider-row";
import { OptionGroup } from "@/components/molecules/option-group";
import { SHAPE_ICONS } from "@/components/organisms/tools/image-editor/editor-tools";
import { HexColourField } from "@/components/organisms/tools/image-editor/hex-colour-field";

const SHAPE_CHOICES = SHAPE_KINDS.map((kind) => {
  const Icon = SHAPE_ICONS[kind];
  return {
    value: kind,
    label: (
      <>
        <Icon className="size-4" aria-hidden />
        <span className="sr-only">{SHAPE_NAMES[kind]}</span>
      </>
    ),
  };
});

interface ShapeOptionsProps {
  tool: EditorTool;
  style: ToolStyle;
  onChange: (patch: Partial<ToolStyle>) => void;
}

/** Settings for the next shape or text layer. */
export function ShapeOptions({ tool, style, onChange }: ShapeOptionsProps) {
  if (tool === "text") {
    return (
      <>
        <OptionGroup
          label="Font"
          choices={FONT_FAMILIES.map(({ label, value }) => ({ label, value }))}
          value={style.fontFamily}
          onChange={(fontFamily) => onChange({ fontFamily })}
          columns={2}
        />
        <SliderRow
          label="Font size"
          value={style.fontSize}
          min={8}
          max={400}
          onChange={(fontSize) => onChange({ fontSize })}
        />
        <HexColourField
          label="Colour"
          value={style.fill}
          onChange={(fill) => onChange({ fill })}
        />
      </>
    );
  }

  const line = style.shape === "line";
  return (
    <>
      <OptionGroup
        label="Shape"
        choices={SHAPE_CHOICES}
        value={style.shape}
        onChange={(shape) => onChange({ shape })}
        columns={7}
      />
      {(style.shape === "polygon" || style.shape === "star") && (
        <SliderRow
          label={style.shape === "star" ? "Points" : "Sides"}
          value={style.sides}
          min={MIN_SIDES}
          max={MAX_SIDES}
          onChange={(sides) => onChange({ sides })}
        />
      )}
      {style.shape === "rect" && (
        <SliderRow
          label="Corner radius"
          value={style.cornerRadius}
          min={0}
          max={200}
          onChange={(cornerRadius) => onChange({ cornerRadius })}
        />
      )}
      {!line && (
        <HexColourField
          label="Fill"
          value={style.fill}
          onChange={(fill) => onChange({ fill })}
        />
      )}
      <HexColourField
        label="Stroke"
        value={style.stroke}
        onChange={(stroke) => onChange({ stroke })}
      />
      <SliderRow
        label="Stroke width"
        value={line ? Math.max(1, style.strokeWidth) : style.strokeWidth}
        min={line ? 1 : 0}
        max={100}
        onChange={(strokeWidth) => onChange({ strokeWidth })}
      />
    </>
  );
}
