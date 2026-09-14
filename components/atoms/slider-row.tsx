"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
  disabled,
  className,
}: SliderRowProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-muted-foreground text-xs tabular-nums">
          {value}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        disabled={disabled}
        onValueChange={([next]) => onChange(next)}
        aria-label={label}
      />
    </div>
  );
}
