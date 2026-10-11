import type { Rgb } from "@/lib/colour/colour";
import { COLOUR_FORMATS } from "@/lib/colour/colour-format";
import { cn } from "@/lib/utils";
import { CopyButton } from "@/components/atoms/copy-button";

interface ColourFormatListProps {
  colour: Rgb;
  className?: string;
}

/** One colour written out in every supported notation, each with a copy button. */
export function ColourFormatList({ colour, className }: ColourFormatListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {COLOUR_FORMATS.map(({ label, format }) => {
        const value = format(colour);
        return (
          <div key={label} className="space-y-1.5">
            <p className="text-muted-foreground text-xs">{label}</p>
            <div className="flex items-center gap-2">
              <code className="bg-muted flex-1 truncate rounded-md px-3 py-2 font-mono text-sm">
                {value}
              </code>
              <CopyButton value={value} iconOnly label={`Copy ${label}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type { ColourFormatListProps };
