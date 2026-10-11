"use client";

import type { ToneRange } from "@/lib/image/editor/retouch";
import type { EditorTool } from "@/lib/image/editor/shortcuts";
import type {
  CloneAlign,
  CloneSample,
  GradientKind,
  ToneMode,
  ToolStyle,
} from "@/lib/image/editor/tool-style";
import { PillButton } from "@/components/atoms/pill-button";
import { SliderRow } from "@/components/atoms/slider-row";
import { OptionGroup } from "@/components/molecules/option-group";
import { HexColourField } from "@/components/organisms/tools/image-editor/hex-colour-field";

const GRADIENTS: readonly { value: GradientKind; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
];

const TONES: readonly { value: ToneMode; label: string }[] = [
  { value: "dodge", label: "Dodge" },
  { value: "burn", label: "Burn" },
];

const TONE_RANGES: readonly { value: ToneRange; label: string }[] = [
  { value: "shadows", label: "Shadows" },
  { value: "midtones", label: "Midtones" },
  { value: "highlights", label: "Highlights" },
];

const CLONE_SAMPLES: readonly { value: CloneSample; label: string }[] = [
  { value: "all", label: "All layers" },
  { value: "layer", label: "This layer" },
];

const CLONE_ALIGNS: readonly { value: CloneAlign; label: string }[] = [
  { value: "aligned", label: "Aligned" },
  { value: "restart", label: "Restart" },
];

/** Tools that paint with a round brush tip. */
const TIPPED = new Set<EditorTool>([
  "brush",
  "eraser",
  "clone",
  "heal",
  "tone",
]);

interface BrushOptionsProps {
  tool: EditorTool;
  style: ToolStyle;
  onChange: (patch: Partial<ToolStyle>) => void;
}

/** Settings for the tools that put down pixels: brushes, the fill bucket and gradients. */
export function BrushOptions({ tool, style, onChange }: BrushOptionsProps) {
  const coloured = tool === "brush" || tool === "fill" || tool === "gradient";
  return (
    <>
      {tool === "tone" && (
        <>
          <OptionGroup
            label="Mode"
            choices={TONES}
            value={style.tone}
            onChange={(tone) => onChange({ tone })}
          />
          <OptionGroup
            label="Range"
            choices={TONE_RANGES}
            value={style.toneRange}
            onChange={(toneRange) => onChange({ toneRange })}
          />
          <PillButton
            active={style.protectTones}
            ariaPressed={style.protectTones}
            onClick={() => onChange({ protectTones: !style.protectTones })}
          >
            Protect tones
          </PillButton>
        </>
      )}
      {(tool === "clone" || tool === "heal") && (
        <>
          <OptionGroup
            label="Sample"
            choices={CLONE_SAMPLES}
            value={style.cloneSample}
            onChange={(cloneSample) => onChange({ cloneSample })}
          />
          <OptionGroup
            label="Source"
            choices={CLONE_ALIGNS}
            value={style.cloneAlign}
            onChange={(cloneAlign) => onChange({ cloneAlign })}
            hint="Aligned keeps one offset for every stroke; Restart begins each stroke at the source."
          />
        </>
      )}
      {tool === "gradient" && (
        <OptionGroup
          label="Type"
          choices={GRADIENTS}
          value={style.gradient}
          onChange={(gradient) => onChange({ gradient })}
        />
      )}
      {TIPPED.has(tool) && (
        <>
          <SliderRow
            label="Size"
            value={style.brushSize}
            min={1}
            max={200}
            onChange={(brushSize) => onChange({ brushSize })}
          />
          <SliderRow
            label="Hardness"
            value={style.brushHardness}
            min={0}
            max={100}
            onChange={(brushHardness) => onChange({ brushHardness })}
          />
        </>
      )}
      {tool === "tone" ? (
        <SliderRow
          label="Strength"
          value={style.toneStrength}
          min={1}
          max={100}
          onChange={(toneStrength) => onChange({ toneStrength })}
        />
      ) : (
        <SliderRow
          label="Opacity"
          value={style.brushOpacity}
          min={1}
          max={100}
          onChange={(brushOpacity) => onChange({ brushOpacity })}
        />
      )}
      {tool === "fill" && (
        <SliderRow
          label="Tolerance"
          value={style.tolerance}
          min={0}
          max={255}
          onChange={(tolerance) => onChange({ tolerance })}
        />
      )}
      {coloured && (
        <HexColourField
          label={tool === "gradient" ? "From" : "Colour"}
          value={style.brushColour}
          onChange={(brushColour) => onChange({ brushColour })}
        />
      )}
      {tool === "gradient" && (
        <HexColourField
          label="To"
          value={style.secondaryColour}
          onChange={(secondaryColour) => onChange({ secondaryColour })}
        />
      )}
    </>
  );
}
