/**
 * Read an image's pixel size from its header, without decoding it.
 *
 * Every tool wants to report the size of what it was given, but a full decode
 * costs the whole image in memory and time, and the pipeline is about to
 * decode the same file again a moment later. The dimensions live in the first
 * few dozen bytes of every common format, so they are read straight out of
 * those instead.
 *
 * Anything unrecognised falls back to a real decode, so an exotic format still
 * reports its size rather than nothing.
 */

export interface Dimensions {
  sourceWidth: number;
  sourceHeight: number;
}

/** Enough for the header of any common format, including a fat JPEG EXIF block. */
const HEADER_BYTES = 65_536;

const size = (width: number, height: number): Dimensions | undefined =>
  width > 0 && height > 0
    ? { sourceWidth: width, sourceHeight: height }
    : undefined;

function readPng(view: DataView): Dimensions | undefined {
  // 8-byte signature, then a length and "IHDR", then width and height.
  if (view.byteLength < 24) return undefined;
  return size(view.getUint32(16), view.getUint32(20));
}

function readGif(view: DataView): Dimensions | undefined {
  if (view.byteLength < 10) return undefined;
  return size(view.getUint16(6, true), view.getUint16(8, true));
}

function readBmp(view: DataView): Dimensions | undefined {
  if (view.byteLength < 26) return undefined;
  // Height is signed: a negative one means the rows are stored top-down.
  return size(view.getInt32(18, true), Math.abs(view.getInt32(22, true)));
}

/**
 * JPEG is a chain of segments. The size lives in the "start of frame" one,
 * whose marker is 0xFFC0–0xFFCF except for the four that mean something else.
 */
function readJpeg(view: DataView): Dimensions | undefined {
  let offset = 2;

  while (offset + 9 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return undefined;

    const marker = view.getUint8(offset + 1);
    // Padding between segments, and standalone markers carrying no length.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }

    const isFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 && // Huffman table
      marker !== 0xc8 && // JPEG extensions
      marker !== 0xcc; // Arithmetic coding conditioning
    if (isFrame) {
      return size(view.getUint16(offset + 7), view.getUint16(offset + 5));
    }

    offset += 2 + view.getUint16(offset + 2);
  }

  return undefined;
}

/** WebP comes in three flavours, each storing its size differently. */
function readWebp(view: DataView): Dimensions | undefined {
  if (view.byteLength < 30) return undefined;
  const chunk = String.fromCharCode(
    view.getUint8(12),
    view.getUint8(13),
    view.getUint8(14),
    view.getUint8(15),
  );

  if (chunk === "VP8 ") {
    // Lossy: a 3-byte start code, then 14-bit width and height.
    return size(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff);
  }
  if (chunk === "VP8L") {
    // Lossless: 14 bits each, packed across four bytes after the signature.
    const bits = view.getUint32(21, true);
    return size((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
  }
  if (chunk === "VP8X") {
    // Extended: two 24-bit little-endian values, each stored one less.
    const read24 = (at: number) =>
      view.getUint8(at) | (view.getUint8(at + 1) << 8) | (view.getUint8(at + 2) << 16);
    return size(read24(24) + 1, read24(27) + 1);
  }
  return undefined;
}

function matches(view: DataView, offset: number, signature: number[]): boolean {
  if (view.byteLength < offset + signature.length) return false;
  return signature.every((byte, index) => view.getUint8(offset + index) === byte);
}

/** Pixel size from a decoded header, or undefined if the format is unknown. */
export function readDimensions(buffer: ArrayBuffer): Dimensions | undefined {
  const view = new DataView(buffer);
  if (view.byteLength < 12) return undefined;

  // 0x89 P N G
  if (matches(view, 0, [0x89, 0x50, 0x4e, 0x47])) return readPng(view);
  // G I F
  if (matches(view, 0, [0x47, 0x49, 0x46])) return readGif(view);
  // B M
  if (matches(view, 0, [0x42, 0x4d])) return readBmp(view);
  // 0xFF 0xD8 0xFF
  if (matches(view, 0, [0xff, 0xd8, 0xff])) return readJpeg(view);
  // R I F F .... W E B P
  if (
    matches(view, 0, [0x52, 0x49, 0x46, 0x46]) &&
    matches(view, 8, [0x57, 0x45, 0x42, 0x50])
  ) {
    return readWebp(view);
  }

  return undefined;
}

/**
 * The natural size from the file's header alone, or undefined when the format
 * is not one this can read. Never decodes, so a caller that is about to decode
 * anyway can use this to work out what size to decode at.
 */
export async function readImageHeader(
  file: Blob,
): Promise<Dimensions | undefined> {
  try {
    return readDimensions(await file.slice(0, HEADER_BYTES).arrayBuffer());
  } catch {
    return undefined;
  }
}

/**
 * The natural size of an image file. Reads the header where the format is one
 * of the common ones, and only decodes when it has to.
 */
export async function measureImage(file: Blob): Promise<Dimensions | undefined> {
  const fromHeader = await readImageHeader(file);
  if (fromHeader) return fromHeader;

  try {
    const bitmap = await createImageBitmap(file);
    const measured = size(bitmap.width, bitmap.height);
    bitmap.close();
    return measured;
  } catch {
    // A file the browser cannot decode will fail again, and more usefully, in
    // the processor, so there is no need to report it twice.
    return undefined;
  }
}
