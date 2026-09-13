"use client";

import { useState } from "react";

import {
  type Rgb,
} from "@/lib/colour/colour";
import {
  formatHex,
  parseColour,
} from "@/lib/colour/colour-format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ColourInputProps {
  label: string;
  value: Rgb;
  onChange: (colour: Rgb) => void;
}

/**
 * A colour field that accepts anything you can type (hex, `rgb()`, `hsl()`,
 * `oklch()`) alongside the system picker.
 *
 * The text is held separately from the parsed colour so a half-typed value
 * like `#ff` is not thrown away mid-keystroke; the colour only moves once
 * what is in the box actually parses.
 */
export function ColourInput({ label, value, onChange }: ColourInputProps) {
  const [text, setText] = useState(() => formatHex(value));
  const [seen, setSeen] = useState(value);

  // Follow changes made elsewhere (the picker, a swatch, a swap button)
  // without fighting the user while they are typing. Adjusting during render
  // rather than in an effect avoids a second pass with stale text on screen.
  if (formatHex(value) !== formatHex(seen)) {
    setSeen(value);
    const parsed = parseColour(text);
    if (!parsed || formatHex(parsed) !== formatHex(value)) {
      setText(formatHex(value));
    }
  }

  const handleText = (next: string) => {
    setText(next);
    const parsed = parseColour(next);
    if (parsed) onChange(parsed);
  };

  const isValid = parseColour(text) !== undefined;
  // The native picker cannot show alpha, so it is fed the opaque hex.
  const swatchHex = formatHex({ ...value, a: 1 });

  return (
    <div className="space-y-2">
      <Label className="text-xs" htmlFor={`colour-${label}`}>
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={swatchHex}
          onChange={(event) => handleText(event.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0"
        />
        <Input
          id={`colour-${label}`}
          value={text}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={!isValid}
          onChange={(event) => handleText(event.target.value)}
          className="font-mono text-sm"
        />
      </div>
      {!isValid && (
        <p className="text-muted-foreground text-xs">
          Not a colour yet. Try a hex, rgb(), hsl() or oklch() value.
        </p>
      )}
    </div>
  );
}
