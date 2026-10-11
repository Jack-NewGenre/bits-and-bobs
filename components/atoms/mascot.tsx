"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { cn } from "@/lib/utils";
import { gazeOnSphere, gazeShift } from "@/lib/gaze";
import { usePointerGaze } from "@/hooks/use-pointer-gaze";
import { MascotHat } from "@/components/atoms/mascot-hat";
import { MascotHammer } from "@/components/atoms/mascot-hammer";

interface MascotProps {
  className?: string;
}

/** Like the blob avatars this is modelled on, there is no mouth: the eyes carry the expression. */
type Eyes = "calm" | "focused" | "happy" | "excited" | "surprised";

interface EyeShape {
  width: number;
  height: number;
  /** Degrees the left eye leans; the right eye mirrors it. */
  tilt: number;
}

const EYES: Record<Eyes, EyeShape> = {
  calm: { width: 12, height: 24, tilt: 0 },
  focused: { width: 10, height: 22, tilt: -8 },
  happy: { width: 11, height: 17, tilt: -32 },
  excited: { width: 18, height: 28, tilt: 0 },
  surprised: { width: 18, height: 18, tilt: 0 },
};

interface Reaction {
  name: "swing" | "bounce" | "spin" | "wobble";
  eyes: Eyes;
  says: string;
}

/** What a poke does, in turn. Each one plays an animation, an eye shape and a line. */
const REACTIONS: Reaction[] = [
  { name: "swing", eyes: "focused", says: "Tap tap." },
  { name: "bounce", eyes: "happy", says: "Boing!" },
  { name: "spin", eyes: "excited", says: "Wheee!" },
  { name: "wobble", eyes: "surprised", says: "Nothing leaves this tab." },
];

/** How long a reaction (and its speech bubble) stays up, in ms. */
export const REACTION_MS = 1100;

const eyeStyle = ({ width, height }: EyeShape): CSSProperties => ({
  x: 80 - width / 2,
  y: 92 - height / 2,
  width,
  height,
  rx: Math.min(width, height) / 2,
});

const FEATURE = "origin-center transform-fill";
const INK = "#1f1d24";

/**
 * Bob, the hard-hatted mascot from the app icon. His head turns to follow the
 * pointer, and every poke gets a different reaction.
 */
export function Mascot({ className }: MascotProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const pokes = useRef(0);
  const [active, setActive] = useState<{
    reaction: Reaction;
    key: number;
  } | null>(null);
  usePointerGaze(ref);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setActive(null), REACTION_MS);
    return () => clearTimeout(timer);
  }, [active]);

  const poke = () => {
    pokes.current += 1;
    setActive({
      reaction: REACTIONS[pokes.current % REACTIONS.length],
      key: pokes.current,
    });
  };

  const eyes = EYES[active?.reaction.eyes ?? "calm"];

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <button
        ref={ref}
        type="button"
        aria-label="Poke the mascot"
        data-reaction={active?.reaction.name}
        data-eyes={active?.reaction.eyes}
        onClick={poke}
        className="group focus-visible:ring-ring/50 size-24 cursor-pointer rounded-3xl outline-none transition-transform focus-visible:ring-[3px] active:scale-95 sm:size-28"
      >
        <svg
          viewBox="0 0 160 160"
          aria-hidden
          className="size-full overflow-visible [transition:--gaze-x_0.35s_ease-out,--gaze-y_0.35s_ease-out]"
        >
          <defs>
            <linearGradient id="mascot-skin" x1="0.2" y1="0" x2="0.6" y2="1">
              <stop offset="0" stopColor="#ffa02e" />
              <stop offset="1" stopColor="#ef6f08" />
            </linearGradient>
            <clipPath id="mascot-head">
              <circle cx="80" cy="92" r="54" />
            </clipPath>
          </defs>

          <ellipse cx="80" cy="152" rx="40" ry="4" className="fill-foreground/10" />

          <g className="group-data-[reaction=spin]:motion-safe:animate-mascot-spin transform-view origin-[80px_92px]">
            <g style={{ transform: gazeShift(5, 3) }}>
              <g
                className={cn(
                  "motion-safe:animate-mascot-breathe transform-view origin-[80px_146px]",
                  "group-data-[reaction=bounce]:motion-safe:animate-mascot-bounce",
                  "group-data-[reaction=wobble]:motion-safe:animate-mascot-wobble"
                )}
              >
                <circle cx="80" cy="92" r="54" fill="url(#mascot-skin)" />

                <g clipPath="url(#mascot-head)">
                  {[-18, 18].map((lon) => (
                    <g
                      key={lon}
                      className={FEATURE}
                      style={{ transform: gazeOnSphere(lon, 10, 54) }}
                    >
                      <g
                        className="transform-view origin-[80px_92px] transition-transform duration-300"
                        style={{ transform: `rotate(${Math.sign(lon) * -eyes.tilt}deg)` }}
                      >
                        <rect
                          fill={INK}
                          className={cn(
                            FEATURE,
                            "transition-all duration-300 motion-safe:animate-mascot-blink"
                          )}
                          style={eyeStyle(eyes)}
                        />
                      </g>
                    </g>
                  ))}
                </g>

                <MascotHat />
                <MascotHammer handFill="url(#mascot-skin)" />
              </g>
            </g>
          </g>
        </svg>
      </button>

      <span role="status" className="absolute top-0 left-[72%] -translate-y-full">
        {active && (
          <span
            key={active.key}
            className="bg-foreground text-background animate-in fade-in zoom-in-90 slide-in-from-bottom-1 relative block rounded-xl px-3 py-1.5 text-sm font-medium whitespace-nowrap shadow-sm duration-200 after:absolute after:top-full after:left-3 after:border-x-[6px] after:border-t-[7px] after:border-x-transparent after:border-t-foreground after:content-['']"
          >
            {active.reaction.says}
          </span>
        )}
      </span>
    </span>
  );
}

export type { MascotProps };
