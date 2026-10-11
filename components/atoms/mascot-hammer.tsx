const STEEL = "#4a4e5a";
const STEEL_LIGHT = "#676c7a";
const HANDLE = "#ffc145";
const HANDLE_EDGE = "#d4870a";
const HAND_EDGE = "#e06a0c";

/**
 * One wedge for the head, like the icon: a flat striking face on the right and
 * a claw that curls down to the left. Drawn around where the handle meets it.
 */
const HEAD =
  "M14 -14C19 -14 19 10 14 10L-8 10C-15 10 -21 13 -25 16C-30 19 -34 12 -30 6C-27 0 -22 -8 -16 -12C-10 -14 0 -14 14 -14Z";

interface MascotHammerProps {
  /** Paint for the hand, so it matches the body it belongs to. */
  handFill: string;
}

/**
 * The claw hammer and the hand gripping it, drawn in the mascot's 160 x 160
 * space. The hand sits at (38, 118), which is also the pivot the swing turns on.
 */
export function MascotHammer({ handFill }: MascotHammerProps) {
  return (
    <g className="group-data-[reaction=swing]:motion-safe:animate-mascot-swing transform-view origin-[38px_118px]">
      <g transform="translate(38 118) rotate(-17)">
        <rect
          x="-4"
          y="-36"
          width="8"
          height="60"
          rx="4"
          fill={HANDLE}
          stroke={HANDLE_EDGE}
          strokeWidth="1.5"
        />
        <rect x="-1.5" y="-33" width="2" height="52" rx="1" fill="#fff" opacity="0.35" />
        <g transform="translate(0 -30)">
          <path d={HEAD} fill={STEEL} />
          <path
            d="M-26 8C-20 0 -12 -7 -2 -10"
            fill="none"
            stroke={STEEL_LIGHT}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <rect x="7" y="-13" width="9" height="22" rx="3.5" fill={STEEL_LIGHT} />
          <rect x="9" y="-11" width="3" height="18" rx="1.5" fill="#fff" opacity="0.2" />
        </g>
      </g>
      <ellipse
        cx="38"
        cy="118"
        rx="16"
        ry="13"
        fill={handFill}
        stroke={HAND_EDGE}
        strokeWidth="2"
        transform="rotate(-30 38 118)"
      />
    </g>
  );
}

export type { MascotHammerProps };
