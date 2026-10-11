"use client";

import { formatHex, parseColour } from "@/lib/colour/colour-format";
import { ColourInput } from "@/components/molecules/colour-input";

const BLACK = { r: 0, g: 0, b: 0, a: 1 };

interface HexColourFieldProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

/** The shared colour input, speaking the hex strings Fabric stores. */
export function HexColourField({
  label,
  value,
  onChange,
}: HexColourFieldProps) {
  return (
    <ColourInput
      label={label}
      value={parseColour(value) ?? BLACK}
      onChange={(colour) => onChange(formatHex(colour))}
    />
  );
}
