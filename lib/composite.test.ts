import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { compositeCutout } from "@/lib/composite";

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

  it("returns a PNG blob for transparent mode without filling", async () => {
    const result = await compositeCutout(cutout, { mode: "transparent" });
    expect(result).toBe(outputBlob);
    expect(ctx.fillRect).not.toHaveBeenCalled();
    // Only the foreground is drawn.
    expect(ctx.drawImage).toHaveBeenCalledTimes(1);
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
