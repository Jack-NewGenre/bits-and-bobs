"use client";

import type {
  LayerStyles,
  StrokePosition,
} from "@/lib/image/editor/layer-styles";
import { PillButton } from "@/components/atoms/pill-button";
import { SliderRow } from "@/components/atoms/slider-row";
import { OptionGroup } from "@/components/molecules/option-group";
import { HexColourField } from "@/components/organisms/tools/image-editor/hex-colour-field";

type Effect = keyof LayerStyles;
type NumericKey<K extends Effect> = {
  [P in keyof LayerStyles[K]]: LayerStyles[K][P] extends number ? P : never;
}[keyof LayerStyles[K]];

interface SliderSpec<K extends Effect> {
  key: NumericKey<K>;
  label: string;
  min: number;
  max: number;
}

const TITLES: Record<Effect, string> = {
  dropShadow: "Drop shadow",
  outerGlow: "Outer glow",
  stroke: "Stroke",
};

const SLIDERS: { [K in Effect]: readonly SliderSpec<K>[] } = {
  dropShadow: [
    { key: "opacity", label: "Opacity", min: 0, max: 100 },
    { key: "angle", label: "Angle", min: -180, max: 180 },
    { key: "distance", label: "Distance", min: 0, max: 200 },
    { key: "size", label: "Size", min: 0, max: 100 },
    { key: "spread", label: "Spread", min: 0, max: 100 },
  ],
  outerGlow: [
    { key: "opacity", label: "Opacity", min: 0, max: 100 },
    { key: "size", label: "Size", min: 0, max: 100 },
    { key: "spread", label: "Spread", min: 0, max: 100 },
  ],
  stroke: [
    { key: "size", label: "Size", min: 1, max: 50 },
    { key: "opacity", label: "Opacity", min: 0, max: 100 },
  ],
};

const POSITIONS: readonly { value: StrokePosition; label: string }[] = [
  { value: "outside", label: "Outside" },
  { value: "centre", label: "Centre" },
  { value: "inside", label: "Inside" },
];

interface LayerStylesPanelProps {
  styles: LayerStyles;
  onChange: (styles: LayerStyles) => void;
}

/** Photoshop-style layer effects: drop shadow, outer glow and stroke. */
export function LayerStylesPanel({ styles, onChange }: LayerStylesPanelProps) {
  const update = <K extends Effect>(
    effect: K,
    patch: Partial<LayerStyles[K]>,
  ) => onChange({ ...styles, [effect]: { ...styles[effect], ...patch } });

  const section = <K extends Effect>(effect: K) => {
    const style = styles[effect];
    return (
      <div key={effect} className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
            {TITLES[effect]}
          </h3>
          <PillButton
            active={style.enabled}
            ariaPressed={style.enabled}
            size="sm"
            onClick={() =>
              update(effect, { enabled: !style.enabled } as Partial<
                LayerStyles[K]
              >)
            }
          >
            {style.enabled ? "On" : "Off"}
          </PillButton>
        </div>
        {style.enabled && (
          <>
            <HexColourField
              label="Colour"
              value={style.colour}
              onChange={(colour) =>
                update(effect, { colour } as Partial<LayerStyles[K]>)
              }
            />
            {SLIDERS[effect].map(({ key, label, min, max }) => (
              <SliderRow
                key={label}
                label={label}
                value={Number(style[key])}
                min={min}
                max={max}
                onChange={(value) =>
                  update(effect, { [key]: value } as Partial<LayerStyles[K]>)
                }
              />
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <section aria-label="Layer styles" className="space-y-4">
      <h2 className="text-xs font-medium">Layer styles</h2>
      {section("dropShadow")}
      {section("outerGlow")}
      {section("stroke")}
      {styles.stroke.enabled && (
        <OptionGroup
          label="Stroke position"
          choices={POSITIONS}
          value={styles.stroke.position}
          onChange={(position) => update("stroke", { position })}
        />
      )}
    </section>
  );
}
