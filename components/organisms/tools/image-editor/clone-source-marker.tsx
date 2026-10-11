import type { Point2D } from "@/lib/image/editor/shapes";

const SIZE = 24;
const HALF = SIZE / 2;
const CROSSHAIR = `M${HALF} 2V${HALF - 4}M${HALF} ${HALF + 4}V${SIZE - 2}M2 ${HALF}H${HALF - 4}M${HALF + 4} ${HALF}H${SIZE - 2}`;

/**
 * The clone stamp's crosshair over the pixels being copied. Drawn in black
 * under white, so it shows on any picture in either theme.
 */
export function CloneSourceMarker({ at }: { at: Point2D | null }) {
  if (!at) return null;
  return (
    <svg
      aria-hidden
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="pointer-events-none absolute"
      style={{ left: at.x - HALF, top: at.y - HALF }}
    >
      <g fill="none" strokeLinecap="round">
        <circle
          cx={HALF}
          cy={HALF}
          r={HALF - 6}
          stroke="#000"
          strokeWidth={3}
        />
        <path d={CROSSHAIR} stroke="#000" strokeWidth={3} />
        <circle
          cx={HALF}
          cy={HALF}
          r={HALF - 6}
          stroke="#fff"
          strokeWidth={1.25}
        />
        <path d={CROSSHAIR} stroke="#fff" strokeWidth={1.25} />
      </g>
    </svg>
  );
}
