import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_VECTORIZE_SETTINGS } from "@/lib/image/vectorize";
import { optimizeSvg } from "@/lib/image/svg-optimize";
import { tracePotrace } from "@/lib/image/trace-engines";

interface PotraceOptions {
  pathonly: boolean;
  turdsize: number;
  alphamax: number;
}

const potrace = vi.fn<
  (source: ImageData, options: PotraceOptions) => Promise<string[]>
>(async () => ["M 0 0 L 1 1 Z", "M 2 2 L 3 3 Z"]);
const init = vi.fn(async () => {});

vi.mock("esm-potrace-wasm", () => ({
  potrace: (source: ImageData, options: PotraceOptions) =>
    potrace(source, options),
  init: () => init(),
}));

const settings = { ...DEFAULT_VECTORIZE_SETTINGS, mode: "bw" as const };
const imageData = { width: 200, height: 100 } as ImageData;

beforeEach(() => {
  potrace.mockClear();
  init.mockClear();
});

describe("tracePotrace", () => {
  it("asks potrace for bare paths and wraps them in a sized document", async () => {
    const svg = await tracePotrace(imageData, settings, 1);

    expect(init).toHaveBeenCalled();
    expect(potrace).toHaveBeenCalledWith(
      imageData,
      expect.objectContaining({ pathonly: true }),
    );
    expect(svg).toContain('viewBox="0 0 200 100"');
    expect(svg).toContain('width="200" height="100"');
    expect(svg.match(/<path/g)).toHaveLength(2);
  });

  it("scales the document back to the original size after a downscaled trace", async () => {
    const svg = await tracePotrace(imageData, settings, 2.5);

    // The viewBox stays in traced coordinates; width/height do the scaling.
    expect(svg).toContain('viewBox="0 0 200 100"');
    expect(svg).toContain('width="500" height="250"');
  });

  it("leaves the fill rule at nonzero so islands inside holes still fill", async () => {
    const svg = await tracePotrace(imageData, settings, 1);
    expect(svg).not.toContain("fill-rule");
    expect(svg).toContain('fill="#000"');
  });

  it("survives the optimiser without losing geometry", async () => {
    const optimized = optimizeSvg(await tracePotrace(imageData, settings, 1));

    // Same fill, so the two shapes merge into one path with both subpaths.
    expect(optimized.match(/<path/g)).toHaveLength(1);
    expect(optimized).toContain("M 0 0 L 1 1 Z M 2 2 L 3 3 Z");
    expect(optimized).not.toContain("fill-rule");
  });

  it("maps the sliders onto potrace's own parameters", async () => {
    await tracePotrace(
      { ...imageData, width: 10, height: 10 } as ImageData,
      { ...settings, smoothing: 50, despeckle: 50 },
      1,
    );

    expect(potrace).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ alphamax: 0.67, turdsize: 10 }),
    );
  });
});
