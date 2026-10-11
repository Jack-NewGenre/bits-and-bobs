"use client";

import { ArrowLeftRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ColourPair {
  colour: string;
  secondary: string;
}

interface ColourPairProps extends ColourPair {
  onChange: (patch: Partial<ColourPair>) => void;
}

/**
 * The main and second colours, overlapping as in Photoshop. The main colour
 * paints, fills and starts gradients; the second ends them.
 */
export function ColourPair({ colour, secondary, onChange }: ColourPairProps) {
  // The second colour comes first so the main one sits on top of it.
  const swatches = [
    {
      key: "secondary",
      label: "Second colour",
      value: secondary,
      className: "right-1 bottom-1",
    },
    {
      key: "colour",
      label: "Main colour",
      value: colour,
      className: "top-1 left-1 z-10",
    },
  ] as const;

  return (
    <div className="flex items-center gap-1">
      <div className="relative size-9">
        {swatches.map((swatch) => (
          <Tooltip key={swatch.key}>
            <TooltipTrigger asChild>
              <label
                className={cn(
                  "absolute size-5 cursor-pointer rounded-md border shadow-sm",
                  swatch.className,
                )}
                style={{ backgroundColor: swatch.value }}
              >
                <input
                  type="color"
                  aria-label={swatch.label}
                  value={swatch.value.slice(0, 7)}
                  onChange={(event) =>
                    onChange({ [swatch.key]: event.target.value })
                  }
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </label>
            </TooltipTrigger>
            <TooltipContent side="top">{swatch.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Swap colours"
            onClick={() => onChange({ colour: secondary, secondary: colour })}
            className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring flex size-6 items-center justify-center rounded-md outline-none focus-visible:ring-2"
          >
            <ArrowLeftRight className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Swap colours</TooltipContent>
      </Tooltip>
    </div>
  );
}
