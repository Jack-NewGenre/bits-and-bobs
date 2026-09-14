"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { PillButton } from "@/components/atoms/pill-button";

interface OptionChoice<T> {
  value: T;
  label: React.ReactNode;
  /** Offered but not selectable, e.g. an engine this image is too big for. */
  disabled?: boolean;
}

interface OptionGroupProps<T> {
  label: string;
  choices: readonly OptionChoice<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Pills per row. Defaults to one column per choice. */
  columns?: number;
  /** Explains the choice underneath, where the answer is not obvious. */
  hint?: React.ReactNode;
  /** Disables the whole group. Individual choices can also disable themselves. */
  disabled?: boolean;
  className?: string;
}

/**
 * A labelled row of pills, one of which is chosen. This is how every tool
 * asks a small either/or question, so the label, the grid and the pressed
 * state live here rather than once per tool.
 */
export function OptionGroup<T extends string | number>({
  label,
  choices,
  value,
  onChange,
  columns,
  hint,
  disabled,
  className,
}: OptionGroupProps<T>) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-xs">{label}</Label>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${columns ?? choices.length}, minmax(0, 1fr))`,
        }}
      >
        {choices.map((choice) => (
          <PillButton
            key={String(choice.value)}
            active={choice.value === value}
            ariaPressed={choice.value === value}
            disabled={disabled || choice.disabled}
            onClick={() => onChange(choice.value)}
          >
            {choice.label}
          </PillButton>
        ))}
      </div>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

export type { OptionGroupProps, OptionChoice };
