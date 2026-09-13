"use client";

import { VISION_MODES, type VisionType } from "@/lib/colour-blindness";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface VisionOptionsProps {
  vision: VisionType;
  onChange: (vision: VisionType) => void;
}

export function VisionOptions({ vision, onChange }: VisionOptionsProps) {
  const active = VISION_MODES.find((mode) => mode.id === vision);

  return (
    <div className="space-y-2">
      <Label className="text-xs">Vision type</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {VISION_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            aria-pressed={vision === mode.id}
            onClick={() => onChange(mode.id)}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left text-xs font-medium transition-colors",
              vision === mode.id
                ? "border-primary bg-accent"
                : "hover:bg-accent/50",
            )}
          >
            {mode.label}
            <span className="text-muted-foreground font-normal">
              {mode.prevalence}
            </span>
          </button>
        ))}
      </div>
      {active && (
        <p className="text-muted-foreground text-xs">{active.description}</p>
      )}
    </div>
  );
}
