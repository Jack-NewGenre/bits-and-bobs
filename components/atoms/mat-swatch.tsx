import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

interface MatSwatchProps {
  /** A theme class from `THEMES`. The swatch wears it, so it shows that mat whatever the page is on. */
  theme: string;
  className?: string;
}

/** `bg-mat` scaled down so a 24px square still reads as a ruled grid. */
const SWATCH_GRID: CSSProperties = {
  backgroundSize: "12px 12px, 12px 12px, 4px 4px, 4px 4px",
};

/** A tiny square of cutting mat: the grid, a 45° guide and a corner of paper. */
export function MatSwatch({ theme, className }: MatSwatchProps) {
  return (
    <span
      aria-hidden
      style={SWATCH_GRID}
      className={cn(
        theme,
        "bg-mat relative block size-6 overflow-hidden rounded-md ring-1 ring-black/20",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-full">
        <line
          x1="0"
          y1="24"
          x2="24"
          y2="0"
          stroke="var(--mat-guide)"
          strokeWidth="1.5"
        />
      </svg>
      <span className="absolute -right-px -bottom-px size-2.5 rounded-tl-[3px] bg-[var(--paper)] shadow-[-1px_-1px_0_var(--paper-shadow)]" />
    </span>
  );
}

export type { MatSwatchProps };
