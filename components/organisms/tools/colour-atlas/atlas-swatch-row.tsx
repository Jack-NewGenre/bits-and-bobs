import type { Rgb } from "@/lib/colour/colour";
import { formatHex } from "@/lib/colour/colour-format";
import { ColourSwatch } from "@/components/atoms/colour-swatch";

interface AtlasSwatch {
  colour: Rgb;
  caption: string;
}

interface AtlasSwatchRowProps {
  title: string;
  hint?: string;
  swatches: AtlasSwatch[];
}

/** A titled strip of copyable swatches, one Atlas section. */
export function AtlasSwatchRow({ title, hint, swatches }: AtlasSwatchRowProps) {
  return (
    <section className="space-y-2" aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {hint && (
          <p className="text-muted-foreground truncate text-xs">{hint}</p>
        )}
      </div>
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${swatches.length}, minmax(0, 1fr))`,
        }}
      >
        {swatches.map(({ colour, caption }, index) => (
          <ColourSwatch
            key={`${caption}-${index}`}
            colour={colour}
            caption={caption}
            copyValue={formatHex(colour)}
          />
        ))}
      </div>
    </section>
  );
}

export type { AtlasSwatch, AtlasSwatchRowProps };
