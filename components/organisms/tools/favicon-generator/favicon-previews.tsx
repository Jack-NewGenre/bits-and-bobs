import type { FaviconPreview } from "@/hooks/use-favicons";
import { faviconRole } from "@/lib/image/favicon";

interface FaviconPreviewsProps {
  favicons: FaviconPreview[];
}

/** Largest preview tile, so a 512px icon does not swamp the panel. */
const MAX_TILE = 96;

/** Every rendered size at its true pixel size (capped), with where it is used. */
export function FaviconPreviews({ favicons }: FaviconPreviewsProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {favicons.map(({ size, url }) => {
        const tile = Math.min(size, MAX_TILE);
        return (
          <li
            key={size}
            className="bg-muted/40 flex flex-col items-center justify-end gap-2 rounded-lg border p-3"
          >
            <div className="flex h-24 items-center justify-center">
              <img
                src={url}
                alt={`${size}×${size} icon`}
                width={tile}
                height={tile}
                className="bg-checkerboard"
              />
            </div>
            <div className="text-center">
              <p className="font-mono text-xs">
                {size}×{size}
              </p>
              <p className="text-muted-foreground text-xs">
                {faviconRole(size)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
