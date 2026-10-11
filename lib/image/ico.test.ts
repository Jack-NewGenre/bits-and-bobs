import { describe, expect, it } from "vitest";

import { encodeIco } from "@/lib/image/ico";

const png = (length: number, fill: number) => new Uint8Array(length).fill(fill);

describe("encodeIco", () => {
  it("writes the header with the image count", () => {
    const bytes = encodeIco([
      { size: 16, png: png(4, 1) },
      { size: 32, png: png(4, 2) },
    ]);
    const view = new DataView(bytes.buffer);

    expect(view.getUint16(0, true)).toBe(0);
    expect(view.getUint16(2, true)).toBe(1);
    expect(view.getUint16(4, true)).toBe(2);
  });

  it("sorts smallest first and points each entry at its data", () => {
    const bytes = encodeIco([
      { size: 32, png: png(5, 2) },
      { size: 16, png: png(3, 1) },
    ]);
    const view = new DataView(bytes.buffer);
    const dataStart = 6 + 16 * 2;

    expect(bytes.length).toBe(dataStart + 3 + 5);
    expect(view.getUint8(6)).toBe(16);
    expect(view.getUint32(6 + 8, true)).toBe(3);
    expect(view.getUint32(6 + 12, true)).toBe(dataStart);
    expect(view.getUint8(22)).toBe(32);
    expect(view.getUint32(22 + 12, true)).toBe(dataStart + 3);
    expect([...bytes.slice(dataStart, dataStart + 3)]).toEqual([1, 1, 1]);
    expect([...bytes.slice(dataStart + 3)]).toEqual([2, 2, 2, 2, 2]);
  });

  it("marks 32 bits per pixel and one colour plane", () => {
    const view = new DataView(encodeIco([{ size: 48, png: png(1, 0) }]).buffer);

    expect(view.getUint16(6 + 4, true)).toBe(1);
    expect(view.getUint16(6 + 6, true)).toBe(32);
  });

  it("stores 256 as 0, since a byte cannot hold it", () => {
    const bytes = encodeIco([{ size: 256, png: png(1, 0) }]);

    expect(bytes[6]).toBe(0);
    expect(bytes[7]).toBe(0);
  });

  it("refuses a size the format cannot hold", () => {
    expect(() => encodeIco([{ size: 512, png: png(1, 0) }])).toThrow(
      RangeError,
    );
  });
});
