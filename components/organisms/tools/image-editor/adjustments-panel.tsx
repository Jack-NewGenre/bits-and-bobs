"use client";

import {
  ADJUSTMENT_GROUPS,
  DEFAULT_ADJUSTMENTS,
  isNeutral,
  TOGGLE_ADJUSTMENTS,
  type Adjustments,
} from "@/lib/image/editor/adjustments";
import { Button } from "@/components/ui/button";
import { PillButton } from "@/components/atoms/pill-button";
import { SliderRow } from "@/components/atoms/slider-row";
import { ColourRangeAdjuster } from "@/components/organisms/tools/image-editor/colour-range-adjuster";
import { CurveEditor } from "@/components/organisms/tools/image-editor/curve-editor";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
      {children}
    </h3>
  );
}

interface AdjustmentsPanelProps {
  adjustments: Adjustments;
  onChange: (adjustments: Adjustments) => void;
}

/** Non-destructive colour and effect adjustments for an image layer. */
export function AdjustmentsPanel({
  adjustments,
  onChange,
}: AdjustmentsPanelProps) {
  return (
    <section aria-label="Adjustments" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium">Adjustments</h2>
        <Button
          variant="ghost"
          size="xs"
          disabled={isNeutral(adjustments)}
          onClick={() => onChange(DEFAULT_ADJUSTMENTS)}
        >
          Reset
        </Button>
      </div>
      {ADJUSTMENT_GROUPS.map((group) => (
        <div key={group.title} className="space-y-3">
          <SectionTitle>{group.title}</SectionTitle>
          {group.sliders.map(({ key, label, min, max }) => (
            <SliderRow
              key={key}
              label={label}
              value={adjustments[key]}
              min={min}
              max={max}
              onChange={(value) => onChange({ ...adjustments, [key]: value })}
            />
          ))}
        </div>
      ))}
      <div className="space-y-3">
        <SectionTitle>Curves</SectionTitle>
        <CurveEditor
          points={adjustments.curve}
          onChange={(curve) => onChange({ ...adjustments, curve })}
        />
      </div>
      <div className="space-y-3">
        <SectionTitle>Hue / Saturation</SectionTitle>
        <ColourRangeAdjuster
          shifts={adjustments.colourRanges}
          onChange={(colourRanges) =>
            onChange({ ...adjustments, colourRanges })
          }
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TOGGLE_ADJUSTMENTS.map(({ key, label }) => (
          <PillButton
            key={key}
            active={adjustments[key]}
            ariaPressed={adjustments[key]}
            onClick={() =>
              onChange({ ...adjustments, [key]: !adjustments[key] })
            }
          >
            {label}
          </PillButton>
        ))}
      </div>
    </section>
  );
}
