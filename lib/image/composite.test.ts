import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  compositeCutout,
  compositeWithSettings,
  featherRadius,
} from "@/lib/image/composite";

interface MockCtx {
  fillStyle: string;
  fillRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
}

let ctx: MockCtx;
let outputBlob: Blob;

beforeEach(() => {
  outputBlob = new Blob(["png"], { type: "image/png" });

  ctx = {
    fillStyle: "",
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  };

  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 100, height: 80, close: vi.fn() })),
  );

  vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
    if (tag === "canvas") {
      return {
        width: 0,
        height: 0,
        getContext: () => ctx,
        toBlob: (cb: (blob: Blob | null) => void) => cb(outputBlob),
      } as unknown as HTMLCanvasElement;
    }
    return {} as HTMLElement;
  }) as typeof document.createElement);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("compositeCutout", () => {
  const cutout = new Blob(["cutout"], { type: "image/png" });

  it("hands the cutout straight back for transparent mode", async () => {
    const result = await compositeCutout(cutout, { mode: "transparent" });
    // No canvas round trip: transparent mode has nothing to composite.
    expect(result).toBe(cutout);
    expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("fills the canvas for colour mode", async () => {
    await compositeCutout(cutout, { mode: "color", color: "#ff0000" });
    expect(ctx.fillStyle).toBe("#ff0000");
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 80);
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });

  it("draws background then foreground for image mode", async () => {
    const background = {
      width: 200,
      height: 200,
    } as unknown as HTMLImageElement;
    await compositeCutout(cutout, { mode: "image", background });
    expect(ctx.fillRect).not.toHaveBeenCalled();
    // Background + foreground.
    expect(ctx.drawImage).toHaveBeenCalledTimes(2);
  });
});

describe("compositeWithSettings", () => {
  const cutout = new Blob(["cutout"], { type: "image/png" });

  it("returns the untouched cutout in transparent mode", async () => {
    const { blob } = await compositeWithSettings(cutout, {
      mode: "transparent",
      color: "#ffffff",
      feather: 0,
      trim: false,
    });
    expect(blob).toBe(cutout);
  });

  it("bakes in the chosen colour, so a zip matches the preview", async () => {
    const { blob } = await compositeWithSettings(cutout, {
      mode: "color",
      color: "#3b82f6",
      feather: 0,
      trim: false,
    });
    expect(blob).toBe(outputBlob);
    expect(ctx.fillStyle).toBe("#3b82f6");
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 80);
  });

  it("falls back to a plain cutout when image mode has no image yet", async () => {
    const { blob } = await compositeWithSettings(cutout, {
      mode: "image",
      color: "#ffffff",
      feather: 0,
      trim: false,
    });
    expect(blob).toBe(outputBlob);
    expect(ctx.fillRect).not.toHaveBeenCalled();
    // Foreground only, so there is no background to draw.
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
  });
});

describe("featherRadius", () => {
  it("is zero when feathering is off", () => {
    expect(featherRadius(0, 2000)).toBe(0);
  });

  it("scales with the image, so softening looks the same at any size", () => {
    expect(featherRadius(100, 250)).toBe(1);
    expect(featherRadius(100, 2000)).toBe(8);
    // Never below a 1px radius, however small the image.
    expect(featherRadius(100, 10)).toBe(1);
  });

  it("is proportional to the slider and clamps out-of-range input", () => {
    expect(featherRadius(50, 1000)).toBe(2);
    expect(featherRadius(500, 1000)).toBe(4);
    expect(featherRadius(-10, 1000)).toBe(0);
  });
});
