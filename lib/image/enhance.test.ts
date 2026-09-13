import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildFilter,
  computeTargetSize,
  enhanceImage,
  type EnhanceSettings,
} from "@/lib/image/enhance";

const NEUTRAL: EnhanceSettings = {
  engine: "fast",
  format: "source",
  quality: 92,
  scale: 2,
  sharpen: 0,
  denoise: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
};

describe("computeTargetSize", () => {
  it("multiplies by the scale factor", () => {
    expect(computeTargetSize(50, 40, 2)).toEqual({ width: 100, height: 80 });
  });

  it("clamps the longest edge to the maximum", () => {
    const { width, height } = computeTargetSize(3000, 2000, 4, 4096);
    expect(Math.max(width, height)).toBe(4096);
    // Aspect ratio (1.5) preserved.
    expect(width / height).toBeCloseTo(1.5, 1);
  });

  it("never returns a zero dimension", () => {
    expect(computeTargetSize(0, 0, 2)).toEqual({ width: 1, height: 1 });
  });
});

describe("buildFilter", () => {
  it("returns 'none' for neutral settings", () => {
    expect(buildFilter(NEUTRAL)).toBe("none");
  });

  it("composes the tone functions", () => {
    const filter = buildFilter({
      ...NEUTRAL,
      brightness: 10,
      contrast: 20,
      saturation: -50,
    });
    expect(filter).toContain("brightness(1.1)");
    expect(filter).toContain("contrast(1.2)");
    expect(filter).toContain("saturate(0.5)");
  });

  it("no longer blurs for denoise, which would fight the sharpen pass", () => {
    expect(buildFilter({ ...NEUTRAL, denoise: 100 })).toBe("none");
  });
});


interface MockCtx {
  filter: string;
  imageSmoothingEnabled: boolean;
  imageSmoothingQuality: string;
  drawImage: ReturnType<typeof vi.fn>;
  getImageData: ReturnType<typeof vi.fn>;
  putImageData: ReturnType<typeof vi.fn>;
}

describe("enhanceImage", () => {
  let ctx: MockCtx;
  let toBlobType: string | undefined;
  const output = new Blob(["png"], { type: "image/png" });
  const source = new Blob(["src"], { type: "image/jpeg" });

  beforeEach(() => {
    toBlobType = undefined;
    ctx = {
      filter: "",
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
      drawImage: vi.fn(),
      getImageData: vi.fn((_x, _y, w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
      })),
      putImageData: vi.fn(),
    };

    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 20, height: 10, close: vi.fn() })),
    );

    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag === "canvas") {
        return {
          width: 0,
          height: 0,
          getContext: () => ctx,
          toBlob: (
            cb: (blob: Blob | null) => void,
            type: string,
          ) => {
            toBlobType = type;
            cb(output);
          },
        } as unknown as HTMLCanvasElement;
      }
      return {} as HTMLElement;
    }) as typeof document.createElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns the encoded blob, its true size, and a final done stage", async () => {
    const onProgress = vi.fn();
    const result = await enhanceImage(source, NEUTRAL, { onProgress });

    expect(result.blob).toBe(output);
    // The 40x20 source at scale 1 (NEUTRAL) stays 40x20.
    expect(result).toMatchObject({ width: 40, height: 20 });
    expect(toBlobType).toBe("image/jpeg"); // keeps the source format
    expect(onProgress).toHaveBeenLastCalledWith({ stage: "done", fraction: 1 });
  });

  it("skips the sharpen pass when sharpen is 0", async () => {
    await enhanceImage(source, NEUTRAL);
    expect(ctx.getImageData).not.toHaveBeenCalled();
    expect(ctx.putImageData).not.toHaveBeenCalled();
  });

  it("runs the unsharp pass when sharpen > 0", async () => {
    await enhanceImage(source, { ...NEUTRAL, sharpen: 50 });
    // Reads both the sharp base and the blurred copy, writes the result once.
    expect(ctx.getImageData).toHaveBeenCalledTimes(2);
    expect(ctx.putImageData).toHaveBeenCalledTimes(1);
  });

  it("throws AbortError when already aborted, without decoding", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      enhanceImage(source, NEUTRAL, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(createImageBitmap).not.toHaveBeenCalled();
  });
});
