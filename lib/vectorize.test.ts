import { describe, expect, it } from "vitest";

import {
  buildTraceOptions,
  computeTraceSize,
  countSvgPaths,
  despeckleToPathOmit,
  smoothingToTolerance,
  svgToBlob,
  DEFAULT_VECTORIZE_SETTINGS,
  MAX_TRACE_DIM,
  type VectorizeSettings,
  despeckleToTurdSize,
  smoothingToAlphaMax,
} from "@/lib/vectorize";

const BASE: VectorizeSettings = {
  mode: "color",
  colors: 16,
  smoothing: 40,
  despeckle: 25,
};

describe("smoothingToTolerance", () => {
  it("maps the slider range onto the tolerance range", () => {
    expect(smoothingToTolerance(0)).toBeCloseTo(0.1);
    expect(smoothingToTolerance(100)).toBeCloseTo(2.5);
    expect(smoothingToTolerance(50)).toBeCloseTo(1.3);
  });

  it("clamps out-of-range values", () => {
    expect(smoothingToTolerance(-50)).toBeCloseTo(0.1);
    expect(smoothingToTolerance(500)).toBeCloseTo(2.5);
  });
});

describe("despeckleToPathOmit", () => {
  it("maps 0–100 to 0–32 path nodes", () => {
    expect(despeckleToPathOmit(0)).toBe(0);
    expect(despeckleToPathOmit(25)).toBe(8);
    expect(despeckleToPathOmit(100)).toBe(32);
  });

  it("clamps out-of-range values", () => {
    expect(despeckleToPathOmit(-10)).toBe(0);
    expect(despeckleToPathOmit(300)).toBe(32);
  });
});

describe("computeTraceSize", () => {
  it("keeps small images at their native size", () => {
    expect(computeTraceSize(800, 600)).toEqual({
      width: 800,
      height: 600,
      scale: 1,
    });
  });

  it("downscales the longest edge to the maximum", () => {
    const { width, height, scale } = computeTraceSize(4096, 2048);
    expect(Math.max(width, height)).toBe(MAX_TRACE_DIM);
    expect(width / height).toBeCloseTo(2, 1);
    // The scale factor restores the original coordinate space.
    expect(width * scale).toBeCloseTo(4096, 0);
  });

  it("never returns a zero dimension", () => {
    const { width, height } = computeTraceSize(10_000, 1);
    expect(width).toBeGreaterThanOrEqual(1);
    expect(height).toBeGreaterThanOrEqual(1);
  });
});

describe("buildTraceOptions", () => {
  it("derives tolerances and pathomit from the settings", () => {
    const options = buildTraceOptions(BASE);
    expect(options.ltres).toBeCloseTo(smoothingToTolerance(BASE.smoothing));
    expect(options.qtres).toBe(options.ltres);
    expect(options.pathomit).toBe(despeckleToPathOmit(BASE.despeckle));
    expect(options.numberofcolors).toBe(16);
    expect(options.viewbox).toBe(true);
  });

  it("passes the restore scale through", () => {
    expect(buildTraceOptions(BASE, 2.5).scale).toBe(2.5);
  });

  it("clamps the colour count", () => {
    expect(buildTraceOptions({ ...BASE, colors: 1 }).numberofcolors).toBe(2);
    expect(buildTraceOptions({ ...BASE, colors: 900 }).numberofcolors).toBe(64);
  });

  it("uses deterministic greyscale sampling in greyscale mode", () => {
    const options = buildTraceOptions({ ...BASE, mode: "grayscale" });
    expect(options.colorsampling).toBe(0);
    expect(options.colorquantcycles).toBe(1);
    // imagetracerjs's generatepalette only builds a true grey ramp below 8
    // colours. At or above that it builds an RGB colour cube instead.
    expect(options.numberofcolors).toBeLessThan(8);
  });

  it("clamps the greyscale colour count even when the slider allows more", () => {
    expect(
      buildTraceOptions({ ...BASE, mode: "grayscale", colors: 64 })
        .numberofcolors,
    ).toBeLessThan(8);
    expect(
      buildTraceOptions({ ...BASE, mode: "grayscale", colors: 1 })
        .numberofcolors,
    ).toBe(2);
  });

  it("uses a fixed two-tone palette in black & white mode", () => {
    const options = buildTraceOptions({ ...BASE, mode: "bw" });
    expect(options.numberofcolors).toBe(2);
    expect(options.pal).toEqual([
      { r: 0, g: 0, b: 0, a: 255 },
      { r: 255, g: 255, b: 255, a: 255 },
    ]);
  });

  it("returns fresh palette copies each call", () => {
    const first = buildTraceOptions({ ...BASE, mode: "bw" });
    const second = buildTraceOptions({ ...BASE, mode: "bw" });
    expect(first.pal![0]).not.toBe(second.pal![0]);
  });
});

describe("countSvgPaths", () => {
  it("counts path elements", () => {
    expect(countSvgPaths('<svg><path d="M0 0"/><path d="M1 1"/></svg>')).toBe(
      2,
    );
  });

  it("returns 0 when there are none", () => {
    expect(countSvgPaths("<svg></svg>")).toBe(0);
  });
});

describe("svgToBlob", () => {
  it("creates an SVG-typed blob", () => {
    const blob = svgToBlob("<svg></svg>");
    expect(blob.type).toBe("image/svg+xml");
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe("presets", () => {
  it("defaults to the auto preset", () => {
    expect(DEFAULT_VECTORIZE_SETTINGS).toEqual(BASE);
  });
});

describe("potrace parameter mapping", () => {
  it("maps smoothing onto alphamax's useful range", () => {
    expect(smoothingToAlphaMax(0)).toBe(0);
    expect(smoothingToAlphaMax(100)).toBe(1.34);
    expect(smoothingToAlphaMax(50)).toBe(0.67);
  });

  it("maps despeckle onto turdsize", () => {
    expect(despeckleToTurdSize(0)).toBe(0);
    expect(despeckleToTurdSize(100)).toBe(20);
    expect(despeckleToTurdSize(25)).toBe(5);
  });

  it("clamps out-of-range input", () => {
    expect(smoothingToAlphaMax(500)).toBe(1.34);
    expect(despeckleToTurdSize(-5)).toBe(0);
  });
});
