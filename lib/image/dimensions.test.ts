import { describe, expect, it, vi, afterEach } from "vitest";

import { measureImage, readDimensions } from "@/lib/image/dimensions";

const bytes = (...values: number[]) => new Uint8Array(values);

function buffer(...chunks: Uint8Array[]): ArrayBuffer {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out.buffer;
}

const be32 = (value: number) =>
  bytes((value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff);
const be16 = (value: number) => bytes((value >> 8) & 0xff, value & 0xff);
const le16 = (value: number) => bytes(value & 0xff, (value >> 8) & 0xff);
const le32 = (value: number) =>
  bytes(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);

const png = (w: number, h: number) =>
  buffer(
    bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    be32(13),
    bytes(0x49, 0x48, 0x44, 0x52),
    be32(w),
    be32(h),
  );

const gif = (w: number, h: number) =>
  buffer(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61), le16(w), le16(h), bytes(0, 0));

const bmp = (w: number, h: number) =>
  buffer(bytes(0x42, 0x4d), new Uint8Array(16), le32(w), le32(h), new Uint8Array(4));

/** A JPEG with an EXIF segment in front of the frame header, as cameras write. */
const jpeg = (w: number, h: number, exifBytes = 40) =>
  buffer(
    bytes(0xff, 0xd8, 0xff),
    bytes(0xe1),
    be16(exifBytes + 2),
    new Uint8Array(exifBytes),
    bytes(0xff, 0xc0),
    be16(17),
    bytes(8),
    be16(h),
    be16(w),
    new Uint8Array(10),
  );

const webpLossy = (w: number, h: number) =>
  buffer(
    bytes(0x52, 0x49, 0x46, 0x46),
    le32(100),
    bytes(0x57, 0x45, 0x42, 0x50),
    bytes(0x56, 0x50, 0x38, 0x20),
    le32(50),
    new Uint8Array(6),
    le16(w),
    le16(h),
  );

const webpExtended = (w: number, h: number) =>
  buffer(
    bytes(0x52, 0x49, 0x46, 0x46),
    le32(100),
    bytes(0x57, 0x45, 0x42, 0x50),
    bytes(0x56, 0x50, 0x38, 0x58),
    le32(10),
    new Uint8Array(4),
    bytes((w - 1) & 0xff, ((w - 1) >> 8) & 0xff, ((w - 1) >> 16) & 0xff),
    bytes((h - 1) & 0xff, ((h - 1) >> 8) & 0xff, ((h - 1) >> 16) & 0xff),
  );

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("readDimensions", () => {
  it("reads a PNG header", () => {
    expect(readDimensions(png(1920, 1080))).toEqual({
      sourceWidth: 1920,
      sourceHeight: 1080,
    });
  });

  it("reads a GIF header", () => {
    expect(readDimensions(gif(320, 240))).toEqual({
      sourceWidth: 320,
      sourceHeight: 240,
    });
  });

  it("reads a BMP header, whatever way up its rows are stored", () => {
    expect(readDimensions(bmp(64, 32))).toEqual({ sourceWidth: 64, sourceHeight: 32 });
    // A negative height means top-down rows, not a negative image.
    expect(readDimensions(bmp(64, -32))).toEqual({ sourceWidth: 64, sourceHeight: 32 });
  });

  it("walks past a JPEG's other segments to reach the frame header", () => {
    expect(readDimensions(jpeg(4000, 3000))).toEqual({
      sourceWidth: 4000,
      sourceHeight: 3000,
    });
    // A camera's EXIF block can be large; the walk must still find the frame.
    expect(readDimensions(jpeg(800, 600, 2000))).toEqual({
      sourceWidth: 800,
      sourceHeight: 600,
    });
  });

  it("reads both the lossy and extended WebP layouts", () => {
    expect(readDimensions(webpLossy(500, 400))).toEqual({
      sourceWidth: 500,
      sourceHeight: 400,
    });
    expect(readDimensions(webpExtended(2500, 1600))).toEqual({
      sourceWidth: 2500,
      sourceHeight: 1600,
    });
  });

  it("gives up on an unknown format rather than guessing", () => {
    expect(readDimensions(buffer(new Uint8Array(64)))).toBeUndefined();
  });

  it("gives up on a file too short to hold a header", () => {
    expect(readDimensions(buffer(bytes(0x89, 0x50)))).toBeUndefined();
  });
});

describe("measureImage", () => {
  it("reads the header without decoding the image", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);

    const file = new Blob([png(120, 90)], { type: "image/png" });
    await expect(measureImage(file)).resolves.toEqual({
      sourceWidth: 120,
      sourceHeight: 90,
    });
    expect(decode).not.toHaveBeenCalled();
  });

  it("falls back to a decode for a format it cannot parse", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 7, height: 5, close: vi.fn() })),
    );

    const file = new Blob([new Uint8Array(64)], { type: "image/avif" });
    await expect(measureImage(file)).resolves.toEqual({
      sourceWidth: 7,
      sourceHeight: 5,
    });
  });

  it("reports nothing when the file cannot be decoded either", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new Error("bad image");
      }),
    );

    const file = new Blob([new Uint8Array(64)], { type: "image/nonsense" });
    await expect(measureImage(file)).resolves.toBeUndefined();
  });
});
