import { describe, expect, it } from "vitest";

import {
  buildMatrix,
  checkScannability,
  DEFAULT_QR_SETTINGS,
  isFinder,
  matrixToSvg,
  MIN_CONTRAST,
  modulesToPath,
  SAFE_MARGIN,
  type Matrix,
} from "@/lib/generators/qr";

/** A 3x3 matrix with only the centre set, for shape assertions. */
const centre: Matrix = [
  [false, false, false],
  [false, true, false],
  [false, false, false],
];

describe("buildMatrix", () => {
  it("encodes text into a square matrix", async () => {
    const matrix = await buildMatrix("https://example.com", "medium");
    expect(matrix.length).toBeGreaterThan(20);
    expect(matrix.every((row) => row.length === matrix.length)).toBe(true);
  });

  it("sets all three finder corners", async () => {
    const matrix = await buildMatrix("hello", "medium");
    const last = matrix.length - 1;
    expect(matrix[0][0]).toBe(true);
    expect(matrix[0][last]).toBe(true);
    expect(matrix[last][0]).toBe(true);
  });

  it("grows with the error-correction level, which costs capacity", async () => {
    const low = await buildMatrix("a".repeat(100), "low");
    const high = await buildMatrix("a".repeat(100), "high");
    expect(high.length).toBeGreaterThan(low.length);
  });

  it("carries no quiet zone of its own", async () => {
    // The border is added at render time, so row 0 must be real data.
    const matrix = await buildMatrix("hello", "medium");
    expect(matrix[0].some(Boolean)).toBe(true);
  });
});

describe("round trip", () => {
  /**
   * Rasterise a matrix into an RGBA image, the way a camera would see it
   * printed. Anything a real scanner needs (the quiet zone, the contrast,
   * the module grid) has to survive this or the code is decorative.
   */
  function raster(matrix: Matrix, margin = 4, scale = 8) {
    const size = matrix.length;
    const extent = (size + margin * 2) * scale;
    const data = new Uint8ClampedArray(extent * extent * 4).fill(255);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!matrix[y][x]) continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const pixel =
              ((y + margin) * scale + dy) * extent + (x + margin) * scale + dx;
            data[pixel * 4] = 0;
            data[pixel * 4 + 1] = 0;
            data[pixel * 4 + 2] = 0;
          }
        }
      }
    }

    return { width: extent, height: extent, data };
  }

  it.each([
    ["https://example.com", "medium"],
    ["Hello, world! 日本語 🎉", "high"],
    ["WIFI:T:WPA;S:MyNetwork;P:hunter2;;", "quartile"],
    ["a".repeat(300), "low"],
  ] as const)("decodes back to the original: %s", async (text, ecc) => {
    const { decodeQR } = await import("@paulmillr/qr/decode.js");
    const matrix = await buildMatrix(text, ecc);
    expect(decodeQR(raster(matrix))).toBe(text);
  });

  it("still decodes with the minimum quiet zone", async () => {
    const { decodeQR } = await import("@paulmillr/qr/decode.js");
    const matrix = await buildMatrix("https://example.com", "medium");
    expect(decodeQR(raster(matrix, SAFE_MARGIN))).toBe("https://example.com");
  });
});

describe("isFinder", () => {
  const size = 25;

  it("recognises all three corner patterns", () => {
    expect(isFinder(0, 0, size)).toBe(true);
    expect(isFinder(0, size - 1, size)).toBe(true);
    expect(isFinder(size - 1, 0, size)).toBe(true);
    expect(isFinder(6, 6, size)).toBe(true);
  });

  it("excludes the fourth corner, which has no finder", () => {
    expect(isFinder(size - 1, size - 1, size)).toBe(false);
  });

  it("excludes the middle of the code", () => {
    expect(isFinder(12, 12, size)).toBe(false);
    expect(isFinder(7, 7, size)).toBe(false);
  });
});

describe("modulesToPath", () => {
  it("emits nothing for an empty matrix", () => {
    expect(modulesToPath([[false]], "square")).toBe("");
  });

  it("emits one square per dark module", () => {
    expect(modulesToPath(centre, "square")).toBe("M1 1h1v1h-1z");
  });

  it("uses arcs for dots and rounded, but not for squares", async () => {
    // Needs a real code: in a 3x3 fixture every cell falls inside a finder.
    const matrix = await buildMatrix("hello", "medium");
    expect(modulesToPath(matrix, "dot")).toContain("a");
    expect(modulesToPath(matrix, "rounded")).toContain("a");
    expect(modulesToPath(matrix, "square")).not.toContain("a");
  });

  it("keeps the finder patterns solid whatever shape is chosen", async () => {
    const matrix = await buildMatrix("hello", "medium");
    const dots = modulesToPath(matrix, "dot");
    // The top-left finder module is at 0,0 and must be a plain square.
    expect(dots).toContain("M0 0h1v1h-1z");
  });
});

describe("matrixToSvg", () => {
  it("adds the quiet zone to the viewBox", () => {
    const svg = matrixToSvg(centre, { ...DEFAULT_QR_SETTINGS, margin: 4 });
    // 3 modules + 4 either side
    expect(svg).toContain('viewBox="0 0 11 11"');
    expect(svg).toContain("translate(4 4)");
  });

  it("honours the chosen colours", () => {
    const svg = matrixToSvg(centre, {
      ...DEFAULT_QR_SETTINGS,
      foreground: "#123456",
      background: "#abcdef",
    });
    expect(svg).toContain('fill="#abcdef"');
    expect(svg).toContain('fill="#123456"');
  });

  it("sets the exported pixel size", () => {
    const svg = matrixToSvg(centre, { ...DEFAULT_QR_SETTINGS, size: 256 });
    expect(svg).toContain('width="256" height="256"');
  });

  it("clamps an out-of-range margin", () => {
    const svg = matrixToSvg(centre, { ...DEFAULT_QR_SETTINGS, margin: 99 });
    expect(svg).toContain("translate(8 8)");
  });
});

describe("checkScannability", () => {
  it("is happy with the defaults", () => {
    expect(checkScannability(DEFAULT_QR_SETTINGS)).toEqual([]);
  });

  it("warns when the two colours are too close", () => {
    const warnings = checkScannability({
      ...DEFAULT_QR_SETTINGS,
      foreground: "#888888",
    });
    expect(warnings.map((w) => w.kind)).toContain("contrast");
    expect(warnings[0].message).toContain(`${MIN_CONTRAST}:1`);
  });

  it("warns when the quiet zone is too narrow", () => {
    const warnings = checkScannability({
      ...DEFAULT_QR_SETTINGS,
      margin: SAFE_MARGIN - 1,
    });
    expect(warnings.map((w) => w.kind)).toContain("margin");
  });

  it("warns when the code is inverted, which stops it working entirely", () => {
    const warnings = checkScannability({
      ...DEFAULT_QR_SETTINGS,
      foreground: "#ffffff",
      background: "#000000",
    });
    expect(warnings.map((w) => w.kind)).toContain("inverted");
  });

  it("does not cry inversion for an ordinary dark-on-light code", () => {
    expect(
      checkScannability({
        ...DEFAULT_QR_SETTINGS,
        foreground: "#1e293b",
        background: "#f8fafc",
      }).map((w) => w.kind),
    ).not.toContain("inverted");
  });

  it("proves an inverted code really does fail to decode", async () => {
    const { decodeQR } = await import("@paulmillr/qr/decode.js");
    const matrix = await buildMatrix("https://example.com", "medium");

    const paint = (invert: boolean) => {
      const size = matrix.length;
      const scale = 8;
      const margin = 4;
      const extent = (size + margin * 2) * scale;
      const dark = invert ? 255 : 0;
      const light = invert ? 0 : 255;
      const data = new Uint8ClampedArray(extent * extent * 4);
      for (let i = 0; i < extent * extent; i++) {
        data[i * 4] = light;
        data[i * 4 + 1] = light;
        data[i * 4 + 2] = light;
        data[i * 4 + 3] = 255;
      }
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (!matrix[y][x]) continue;
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const p =
                ((y + margin) * scale + dy) * extent + (x + margin) * scale + dx;
              data[p * 4] = dark;
              data[p * 4 + 1] = dark;
              data[p * 4 + 2] = dark;
            }
          }
        }
      }
      return { width: extent, height: extent, data };
    };

    expect(decodeQR(paint(false))).toBe("https://example.com");
    expect(() => decodeQR(paint(true))).toThrow();
  });

  it("reports both problems at once", () => {
    expect(
      checkScannability({
        ...DEFAULT_QR_SETTINGS,
        margin: 0,
        foreground: "#777777",
      }),
    ).toHaveLength(2);
  });
});
