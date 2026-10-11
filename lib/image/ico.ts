/** Packing square PNG images into a single Windows `.ico` file. */

export interface IcoImage {
  /** Width and height in pixels, at most 256. */
  size: number;
  png: Uint8Array;
}

const HEADER_BYTES = 6;
const ENTRY_BYTES = 16;
const MAX_ICO_SIZE = 256;

/**
 * Pack square PNGs into one ICO, smallest first. Every current browser reads
 * PNG data inside an ICO, so there is no need for the older bitmap layout.
 */
export function encodeIco(images: IcoImage[]): Uint8Array<ArrayBuffer> {
  const sorted = [...images].sort((a, b) => a.size - b.size);
  const dataStart = HEADER_BYTES + ENTRY_BYTES * sorted.length;
  const total = sorted.reduce((sum, { png }) => sum + png.length, dataStart);
  const bytes = new Uint8Array(total);
  const view = new DataView(bytes.buffer);

  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, sorted.length, true);

  let offset = dataStart;
  sorted.forEach(({ size, png }, index) => {
    if (size < 1 || size > MAX_ICO_SIZE) {
      throw new RangeError(
        `An ICO image must be 1–${MAX_ICO_SIZE}px, not ${size}px`,
      );
    }
    const entry = HEADER_BYTES + ENTRY_BYTES * index;
    // One byte cannot hold 256, so the format writes it as 0.
    const side = size === MAX_ICO_SIZE ? 0 : size;
    view.setUint8(entry, side);
    view.setUint8(entry + 1, side);
    view.setUint16(entry + 4, 1, true); // colour planes
    view.setUint16(entry + 6, 32, true); // bits per pixel
    view.setUint32(entry + 8, png.length, true);
    view.setUint32(entry + 12, offset, true);
    bytes.set(png, offset);
    offset += png.length;
  });

  return bytes;
}
