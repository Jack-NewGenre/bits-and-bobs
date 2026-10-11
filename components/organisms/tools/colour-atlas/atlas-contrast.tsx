import type { Rgb } from "@/lib/colour/colour";
import { gradeContrast } from "@/lib/colour/colour-contrast";
import { formatHex } from "@/lib/colour/colour-format";
import { Badge } from "@/components/ui/badge";

const BACKGROUNDS: { label: string; colour: Rgb }[] = [
  { label: "On white", colour: { r: 255, g: 255, b: 255, a: 1 } },
  { label: "On black", colour: { r: 0, g: 0, b: 0, a: 1 } },
];

interface AtlasContrastProps {
  colour: Rgb;
}

/** The colour as text on white and on black, with its WCAG grade on each. */
export function AtlasContrast({ colour }: AtlasContrastProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2" aria-label="Contrast">
      {BACKGROUNDS.map(({ label, colour: background }) => {
        const report = gradeContrast(colour, background);
        return (
          <div
            key={label}
            className="flex items-center justify-between gap-3 rounded-lg border p-4"
            style={{
              backgroundColor: formatHex(background),
              color: formatHex(colour),
            }}
          >
            <div>
              <p className="text-lg font-semibold">{label}</p>
              <p className="font-mono text-xs">{report.ratio.toFixed(2)}:1</p>
            </div>
            <Badge
              variant={report.level === "Fail" ? "destructive" : "secondary"}
            >
              {report.level}
            </Badge>
          </div>
        );
      })}
    </section>
  );
}

export type { AtlasContrastProps };
