/**
 * The backdrop a clip art sheet is printed on: either transparency or one
 * flat colour. Knowing it is what lets the pieces be told apart from the
 * space between them, and lets that space be cleared from each cut-out.
 */

/** RGBA pixels, as `ImageData` holds them, without needing a real `ImageData`. */
export interface PixelGrid {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export type Backdrop =
  { kind: "transparent" } | { kind: "colour"; r: number; g: number; b: number };

/** How far a pixel may stray from the backdrop and still count as it, 0–255. */
export const MAX_TOLERANCE = 128;

/** Offsets of every pixel around the edge of the grid, each once. */
function borderOffsets({ width, height }: PixelGrid): number[] {
  const offsets: number[] = [];
  for (let x = 0; x < width; x++) {
    offsets.push(x * 4);
    if (height > 1) offsets.push(((height - 1) * width + x) * 4);
  }
  for (let y = 1; y < height - 1; y++) {
    offsets.push(y * width * 4);
    if (width > 1) offsets.push((y * width + width - 1) * 4);
  }
  return offsets;
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/**
 * Read the backdrop off the image's border. A sheet is mostly margin at its
 * edges, so a border that is mostly see-through means a transparent backdrop,
 * otherwise the median colour wins over the odd piece touching the edge.
 */
export function findBackdrop(grid: PixelGrid): Backdrop {
  const offsets = borderOffsets(grid);
  const opaque = offsets.filter((offset) => grid.data[offset + 3] >= 128);
  if (opaque.length * 2 < offsets.length) return { kind: "transparent" };

  const channel = (shift: number) =>
    median(opaque.map((offset) => grid.data[offset + shift]));
  return { kind: "colour", r: channel(0), g: channel(1), b: channel(2) };
}

/** True when the pixel at `offset` belongs to the backdrop rather than a piece. */
export function matchesBackdrop(
  data: Uint8ClampedArray,
  offset: number,
  backdrop: Backdrop,
  tolerance: number,
): boolean {
  if (data[offset + 3] <= tolerance) return true;
  if (backdrop.kind === "transparent") return false;
  return (
    Math.abs(data[offset] - backdrop.r) <= tolerance &&
    Math.abs(data[offset + 1] - backdrop.g) <= tolerance &&
    Math.abs(data[offset + 2] - backdrop.b) <= tolerance
  );
}

/**
 * Make the backdrop transparent, in place. Only backdrop reachable from the
 * edge is cleared, so the white of an eye inside a white-backed sticker stays.
 */
export function clearBackdrop(
  grid: PixelGrid,
  backdrop: Backdrop,
  tolerance: number,
): void {
  const { data, width, height } = grid;
  const seen = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let top = 0;

  const visit = (pixel: number) => {
    if (seen[pixel]) return;
    seen[pixel] = 1;
    if (matchesBackdrop(data, pixel * 4, backdrop, tolerance))
      stack[top++] = pixel;
  };

  borderOffsets(grid).forEach((offset) => visit(offset / 4));

  while (top > 0) {
    const pixel = stack[--top];
    data[pixel * 4 + 3] = 0;
    const x = pixel % width;
    if (x > 0) visit(pixel - 1);
    if (x < width - 1) visit(pixel + 1);
    if (pixel >= width) visit(pixel - width);
    if (pixel < width * (height - 1)) visit(pixel + width);
  }
}
