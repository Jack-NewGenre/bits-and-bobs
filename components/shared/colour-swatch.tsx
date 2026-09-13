"use client";

import { Check } from "lucide-react";

import { useCopy } from "@/hooks/use-copy";
import {
  type Rgb,
} from "@/lib/colour";
import {
  formatHex,
} from "@/lib/colour-format";
import { bestTextOn } from "@/lib/colour-contrast";
import { cn } from "@/lib/utils";

interface ColourSwatchProps {
  colour: Rgb;
  /** Small label shown inside the swatch, e.g. a shade step. */
  caption?: string;
  /** Text copied on click. Defaults to the hex. */
  copyValue?: string;
  className?: string;
}

/**
 * A colour block you can click to copy. The caption is drawn in whichever of
 * black or white actually reads against the swatch, so a label never
 * disappears into a light yellow or a dark navy.
 */
export function ColourSwatch({
  colour,
  caption,
  copyValue,
  className,
}: ColourSwatchProps) {
  const { copied, copy } = useCopy();
  const hex = formatHex(colour);
  const ink = formatHex(bestTextOn(colour));

  return (
    <button
      type="button"
      onClick={() => void copy(copyValue ?? hex)}
      aria-label={`Copy ${copyValue ?? hex}`}
      style={{ backgroundColor: hex, color: ink }}
      className={cn(
        "flex h-16 w-full flex-col items-start justify-end gap-0.5 rounded-lg border p-2 text-left transition-transform hover:scale-[1.03]",
        className,
      )}
    >
      {caption && <span className="text-xs font-medium">{caption}</span>}
      <span className="flex items-center gap-1 font-mono text-[11px] opacity-80">
        {copied ? (
          <>
            <Check className="size-3" />
            Copied
          </>
        ) : (
          hex
        )}
      </span>
    </button>
  );
}
