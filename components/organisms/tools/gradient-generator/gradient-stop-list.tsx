"use client";

import { Plus, X } from "lucide-react";

import { addStop, MAX_STOPS, type GradientStop } from "@/lib/colour/gradient";
import { Button } from "@/components/ui/button";
import { ColourInput } from "@/components/molecules/colour-input";
import { SliderRow } from "@/components/atoms/slider-row";

interface GradientStopListProps {
  stops: GradientStop[];
  onChange: (stops: GradientStop[]) => void;
}

/** Edit a gradient's colour stops: colour, position, add and remove. */
export function GradientStopList({ stops, onChange }: GradientStopListProps) {
  const update = (index: number, change: Partial<GradientStop>) =>
    onChange(
      stops.map((stop, at) => (at === index ? { ...stop, ...change } : stop)),
    );

  return (
    <div className="space-y-4">
      {stops.map((stop, index) => (
        <div key={index} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-end gap-2">
            <ColourInput
              label={`Stop ${index + 1}`}
              value={stop.colour}
              onChange={(colour) => update(index, { colour })}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove stop ${index + 1}`}
              disabled={stops.length <= 2}
              onClick={() => onChange(stops.filter((_, at) => at !== index))}
            >
              <X />
            </Button>
          </div>
          <SliderRow
            label={`Stop ${index + 1} position`}
            value={stop.position}
            min={0}
            max={100}
            onChange={(position) => update(index, { position })}
          />
        </div>
      ))}

      <Button
        variant="outline"
        className="w-full"
        disabled={stops.length >= MAX_STOPS}
        onClick={() => onChange(addStop(stops))}
      >
        <Plus />
        Add stop
      </Button>
    </div>
  );
}

export type { GradientStopListProps };
