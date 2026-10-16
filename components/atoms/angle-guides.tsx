import { cn } from "@/lib/utils";

interface AngleGuidesProps {
  className?: string;
}

const ANGLES = [15, 30, 45, 60, 75];
const ARC_RADIUS = 260;
const HEIGHT = 400;
const LINE_LENGTH = 1400;

function point(radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: radius * Math.cos(radians),
    y: HEIGHT - radius * Math.sin(radians),
  };
}

/** The angle lines and protractor arc printed in a mat's bottom-left corner. */
export function AngleGuides({ className }: AngleGuidesProps) {
  return (
    <svg
      aria-hidden
      className={cn(
        "text-mat-guide pointer-events-none absolute inset-0 size-full",
        className,
      )}
      viewBox={`0 0 1000 ${HEIGHT}`}
      preserveAspectRatio="xMinYMax slice"
    >
      {ANGLES.map((degrees) => {
        const end = point(LINE_LENGTH, degrees);
        const label = point(ARC_RADIUS + 16, degrees);
        return (
          <g key={degrees}>
            <line
              x1={0}
              y1={HEIGHT}
              x2={end.x}
              y2={end.y}
              stroke="currentColor"
              strokeWidth={0.8}
              strokeDasharray={degrees === 45 ? undefined : "4 5"}
              vectorEffect="non-scaling-stroke"
              opacity={0.55}
            />
            <text
              x={label.x}
              y={label.y}
              fill="currentColor"
              fontSize={11}
              fontFamily="var(--font-mono)"
              opacity={0.8}
            >
              {degrees}°
            </text>
          </g>
        );
      })}
      <path
        d={`M ${ARC_RADIUS} ${HEIGHT} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 0 0 ${HEIGHT - ARC_RADIUS}`}
        fill="none"
        stroke="currentColor"
        vectorEffect="non-scaling-stroke"
        opacity={0.6}
      />
    </svg>
  );
}

export type { AngleGuidesProps };
