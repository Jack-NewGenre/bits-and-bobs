import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/** One grid square of the mat, in pixels. Matches the bg-mat utility. */
export const MAT_UNIT = 24;

const MAJOR = MAT_UNIT * 5;
const MINOR_TICK = 5;
const MAJOR_TICK = 9;

interface MatRulerProps {
  /** How many fifths to number. The parent clips whatever does not fit. */
  labels: number;
  vertical?: boolean;
  className?: string;
}

/** A row of 1px ticks, one every `step` pixels, `length` long, drawn as a repeating gradient. */
function ticks(vertical: boolean, step: number, length: number) {
  const line = `linear-gradient(${vertical ? "180deg" : "90deg"}, currentColor 1px, transparent 1px)`;
  return {
    image: line,
    size: vertical ? `${length}px ${step}px` : `${step}px ${length}px`,
  };
}

function tickStyle(vertical: boolean): CSSProperties {
  const minor = ticks(vertical, MAT_UNIT, MINOR_TICK);
  const major = ticks(vertical, MAJOR, MAJOR_TICK);
  return {
    backgroundImage: `${major.image}, ${minor.image}`,
    backgroundSize: `${major.size}, ${minor.size}`,
    backgroundRepeat: vertical ? "repeat-y" : "repeat-x",
  };
}

/**
 * The ruler printed along a mat's edge: a tick on every grid line, a longer one
 * every fifth, numbered in grid units. Ticks start at the parent's origin, so
 * place it where the mat's grid starts.
 */
export function MatRuler({
  labels,
  vertical = false,
  className,
}: MatRulerProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "text-mat-ruler pointer-events-none absolute font-mono text-[9px] leading-none tabular-nums",
        vertical ? "h-full w-6" : "h-6 w-full",
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-70"
        style={tickStyle(vertical)}
      />
      {Array.from({ length: labels }, (_, index) => {
        const n = (index + 1) * 5;
        const offset = n * MAT_UNIT;
        return (
          <span
            key={n}
            className={cn(
              "absolute",
              vertical ? "-translate-y-1/2" : "-translate-x-1/2",
            )}
            style={
              vertical
                ? { top: offset, left: MAJOR_TICK + 3 }
                : { left: offset, top: MAJOR_TICK + 3 }
            }
          >
            {n}
          </span>
        );
      })}
    </div>
  );
}

export type { MatRulerProps };
