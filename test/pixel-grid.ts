import type { PixelGrid } from "@/lib/image/backdrop";

const COLOURS: Record<string, [number, number, number, number]> = {
  ".": [255, 255, 255, 255],
  ",": [250, 248, 252, 255],
  "#": [0, 0, 0, 255],
  r: [220, 30, 30, 255],
  " ": [0, 0, 0, 0],
};

/**
 * A tiny image drawn in text, one character per pixel: `.` white, `,` near
 * white, `#` black, `r` red, space transparent.
 */
export function pixelGrid(rows: string[]): PixelGrid {
  const width = rows[0].length;
  const data = new Uint8ClampedArray(
    rows.flatMap((row) => [...row].flatMap((c) => COLOURS[c])),
  );
  return { data, width, height: rows.length };
}

/** The alpha of every pixel, drawn back as text: `o` opaque, space clear. */
export function alphaMap({ data, width, height }: PixelGrid): string[] {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      data[(y * width + x) * 4 + 3] ? "o" : " ",
    ).join(""),
  );
}
