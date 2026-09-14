import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  compositeWithSettings,
  featherRadius,
  type BackgroundSettings,
} from "@/lib/image/composite";

interface MockCanvas {
  width: number;
  height: number;
  ctx: MockCtx;
}

interface MockCtx {
  fillStyle: string;
  filter: string;
  fillRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  getImageData: ReturnType<typeof vi.fn>;
  putImageData: ReturnType<typeof vi.fn>;
}

const SOURCE_WIDTH = 100;
const SOURCE_HEIGHT = 80;

let canvases: MockCanvas[] = [];
let outputBlob: Blob;
let toBlobCalls: number;
/** Alpha the mocked `getImageData` reports, so trim has something to find. */
let alphaAt: (x: number, y: number) => number;

/** The last canvas made is the output one, which is what gets encoded. */
const outputCanvas = () => canvases[canvases.length - 1];

const settings = (overrides: Partial<BackgroundSettings>): BackgroundSettings => ({
  ...{ mode: "transparent" as const, color: "#ffffff", feather: 0, trim: false },
  ...overrides,
});

beforeEach(() => {
  canvases = [];
  toBlobCalls = 0;
  outputBlob = new Blob(["png"], { type: "image/png" });
  alphaAt = () => 255;

  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({
      width: SOURCE_WIDTH,
      height: SOURCE_HEIGHT,
      close: vi.fn(),
    })),
  );

  vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
    if (tag !== "canvas") return {} as HTMLElement;

    const ctx: MockCtx = {
      fillStyle: "",
      filter: "",
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => {
        const data = new Uint8ClampedArray(w * h * 4);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) data[(y * w + x) * 4 + 3] = alphaAt(x, y);
        }
        return { data, width: w, height: h };
      }),
      putImageData: vi.fn(),
    };

    const canvas = { width: 0, height: 0, ctx } as MockCanvas;
    canvases.push(canvas);

    return {
      get width() {
        return canvas.width;
      },
      set width(value: number) {
        canvas.width = value;
      },
      get height() {
        return canvas.height;
      },
      set height(value: number) {
        canvas.height = value;
      },
      getContext: () => ctx,
      toBlob: (cb: (blob: Blob | null) => void) => {
        toBlobCalls += 1;
        cb(outputBlob);
      },
    } as unknown as HTMLCanvasElement;
  }) as typeof document.createElement);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("compositeWithSettings", () => {
  const cutout = new Blob(["cutout"], { type: "image/png" });

  it("returns the untouched cutout when there is nothing to composite", async () => {
    const { blob } = await compositeWithSettings(cutout, settings({}));
    expect(blob).toBe(cutout);
    // No canvas at all, so no decode and no re-encode.
    expect(canvases).toHaveLength(0);
  });

  it("bakes in the chosen colour, so a zip matches the preview", async () => {
    const { blob } = await compositeWithSettings(
      cutout,
      settings({ mode: "color", color: "#3b82f6" }),
    );
    expect(blob).toBe(outputBlob);
    expect(outputCanvas().ctx.fillStyle).toBe("#3b82f6");
    expect(outputCanvas().ctx.fillRect).toHaveBeenCalledWith(
      0,
      0,
      SOURCE_WIDTH,
      SOURCE_HEIGHT,
    );
  });

  it("falls back to a plain cutout when image mode has no image yet", async () => {
    const { blob } = await compositeWithSettings(cutout, settings({ mode: "image" }));
    expect(blob).toBe(outputBlob);
    expect(outputCanvas().ctx.fillRect).not.toHaveBeenCalled();
    // Foreground only, so there is no background to draw.
    expect(outputCanvas().ctx.drawImage).toHaveBeenCalledTimes(1);
  });

  it("encodes exactly once however many stages are in play", async () => {
    await compositeWithSettings(
      cutout,
      settings({ mode: "color", feather: 50, trim: true }),
    );
    // Feather, trim and background chained through blobs would encode three
    // times; fused, they share one decode and one encode.
    expect(toBlobCalls).toBe(1);
  });

  it("crops to the subject when trimming", async () => {
    // A 20x20 opaque block in the top-left corner of the source.
    alphaAt = (x, y) => (x < 20 && y < 20 ? 255 : 0);

    await compositeWithSettings(cutout, settings({ mode: "color", trim: true }));

    expect(outputCanvas().width).toBe(20);
    expect(outputCanvas().height).toBe(20);
    expect(outputCanvas().ctx.fillRect).toHaveBeenCalledWith(0, 0, 20, 20);
  });

  it("keeps the full frame when trimming finds nothing opaque", async () => {
    alphaAt = () => 0;

    await compositeWithSettings(cutout, settings({ mode: "color", trim: true }));

    expect(outputCanvas().width).toBe(SOURCE_WIDTH);
    expect(outputCanvas().height).toBe(SOURCE_HEIGHT);
  });

  it("softens only the alpha channel when feathering", async () => {
    await compositeWithSettings(cutout, settings({ feather: 100 }));

    const blurred = canvases.find((canvas) => canvas.ctx.filter !== "");
    expect(blurred?.ctx.filter).toMatch(/^blur\([\d.]+px\)$/);
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
