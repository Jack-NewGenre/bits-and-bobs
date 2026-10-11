import { describe, expect, it } from "vitest";

import {
  alphaChannel,
  hasTransparency,
  MAX_EDGE,
  paintMask,
  stickerArtwork,
  stickerLayout,
  stickerMask,
} from "@/lib/image/sticker";
import { pixelGrid } from "@/test/pixel-grid";

/** A mask drawn back as text: `o` solid, `-` part covered, space clear. */
function maskMap(mask: Uint8ClampedArray, width: number): string[] {
  const rows: string[] = [];
  for (let y = 0; y < mask.length / width; y++) {
    const row = [...mask.slice(y * width, (y + 1) * width)];
    rows.push(
      row
        .map((value) => (value === 255 ? "o" : value > 0 ? "-" : " "))
        .join(""),
    );
  }
  return rows;
}

function maskOf(rows: string[], radius: number): string[] {
  const { data, width, height } = pixelGrid(rows);
  return maskMap(stickerMask(alphaChannel(data), width, height, radius), width);
}

describe("stickerMask", () => {
  it("grows the artwork by the radius with a rounded edge", () => {
    const dot = [
      "       ",
      "       ",
      "       ",
      "   #   ",
      "       ",
      "       ",
      "       ",
    ];

    expect(maskOf(dot, 2)).toEqual([
      "       ",
      "  ---  ",
      " -ooo- ",
      " -ooo- ",
      " -ooo- ",
      "  ---  ",
      "       ",
    ]);
  });

  it("fills holes the border does not reach", () => {
    const ring = [
      "         ",
      " ####### ",
      " #     # ",
      " #     # ",
      " #     # ",
      " ####### ",
      "         ",
    ];

    expect(maskOf(ring, 1)).toEqual([
      "---------",
      "-ooooooo-",
      "-ooooooo-",
      "-ooooooo-",
      "-ooooooo-",
      "-ooooooo-",
      "---------",
    ]);
  });

  it("leaves the alpha alone with no border", () => {
    const alpha = new Uint8ClampedArray([0, 128, 255, 0]);

    expect([...stickerMask(alpha, 2, 2, 0)]).toEqual([0, 128, 255, 0]);
  });

  it("grows from solid pixels only, covering faint ones with the border", () => {
    const alpha = new Uint8ClampedArray([0, 0, 40, 255]);

    expect([...stickerMask(alpha, 4, 1, 1)]).toEqual([0, 0, 128, 255]);
  });
});

describe("stickerLayout", () => {
  it("leaves room for the border and shadow on every side", () => {
    const layout = stickerLayout(200, 100, { border: 5, shadow: true });

    expect(layout).toMatchObject({ artWidth: 200, artHeight: 100, radius: 10 });
    expect(layout.inset).toBe(
      10 + layout.shadowBlur * 2 + layout.shadowOffset + 1,
    );
    expect(layout.width).toBe(200 + layout.inset * 2);
  });

  it("drops the shadow margin when there is no shadow", () => {
    expect(stickerLayout(100, 100, { border: 0, shadow: false })).toMatchObject(
      {
        inset: 1,
        shadowBlur: 0,
        shadowOffset: 0,
      },
    );
  });

  it("scales very large artwork down to the working size", () => {
    const layout = stickerLayout(MAX_EDGE * 2, MAX_EDGE, {
      border: 0,
      shadow: false,
    });

    expect([layout.artWidth, layout.artHeight]).toEqual([
      MAX_EDGE,
      MAX_EDGE / 2,
    ]);
  });
});

describe("paintMask", () => {
  it("fills the silhouette with the colour, scaling its alpha", () => {
    const target = new Uint8ClampedArray(8);
    paintMask(
      new Uint8ClampedArray([255, 100]),
      { r: 10, g: 20, b: 30, a: 0.5 },
      target,
    );

    expect([...target]).toEqual([10, 20, 30, 128, 10, 20, 30, 50]);
  });
});

describe("hasTransparency", () => {
  it("spots a clear background", () => {
    expect(hasTransparency(new Uint8ClampedArray([255, 255, 0]))).toBe(true);
  });

  it("treats a fully solid image as needing its background removed", () => {
    expect(hasTransparency(new Uint8ClampedArray([255, 255, 200]))).toBe(false);
  });
});

describe("stickerArtwork", () => {
  const original = new Blob(["original"]);
  const cutout = new Blob(["cutout"]);

  it("draws from the cut-out when the background is removed", () => {
    expect(stickerArtwork(original, cutout, { removeBackground: true })).toBe(
      cutout,
    );
  });

  it("draws from the original when the background is kept", () => {
    expect(stickerArtwork(original, cutout, { removeBackground: false })).toBe(
      original,
    );
  });
});
