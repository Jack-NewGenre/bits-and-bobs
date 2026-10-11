import { describe, expect, it, vi } from "vitest";

import { cutoutName, detectionScale, paintCutout } from "@/lib/image/cutout";

describe("cutoutName", () => {
  it("numbers each piece from one, always as a PNG", () => {
    expect(cutoutName("stickers.jpg", 0)).toBe("stickers-1.png");
    expect(cutoutName("sheet.final.webp", 11)).toBe("sheet.final-12.png");
  });
});

describe("detectionScale", () => {
  it("leaves a small image alone and shrinks a large one", () => {
    expect(detectionScale({ width: 800, height: 600 })).toBe(1);
    expect(detectionScale({ width: 2400, height: 4800 })).toBe(0.25);
  });
});

/** A canvas whose context records the calls made on it, in order. */
function recordingCanvas(width: number, height: number) {
  const calls: unknown[][] = [];
  const record =
    (name: string) =>
    (...args: unknown[]) =>
      calls.push([name, ...args]);
  const ctx = Object.fromEntries(
    [
      "clearRect",
      "save",
      "beginPath",
      "lineTo",
      "closePath",
      "clip",
      "drawImage",
      "restore",
    ].map((name) => [name, vi.fn(record(name))]),
  );
  const canvas = {
    width,
    height,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
  return { canvas, calls };
}

describe("paintCutout", () => {
  const image = {} as CanvasImageSource;

  it("clips to the lasso outline, scaled to the canvas, before drawing", () => {
    const { canvas, calls } = recordingCanvas(50, 25);
    const path = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 50 },
    ];
    paintCutout(canvas, image, { x: 10, y: 20, width: 100, height: 50, path });

    expect(calls.map(([name]) => name)).toEqual([
      "clearRect",
      "save",
      "beginPath",
      "lineTo",
      "lineTo",
      "lineTo",
      "closePath",
      "clip",
      "drawImage",
      "restore",
    ]);
    expect(calls.filter(([name]) => name === "lineTo")).toEqual([
      ["lineTo", 0, 0],
      ["lineTo", 50, 0],
      ["lineTo", 25, 25],
    ]);
    expect(calls).toContainEqual([
      "drawImage",
      image,
      10,
      20,
      100,
      50,
      0,
      0,
      50,
      25,
    ]);
  });

  it("draws a plain box without clipping", () => {
    const { canvas, calls } = recordingCanvas(40, 40);
    paintCutout(canvas, image, { x: 0, y: 0, width: 40, height: 40 });
    expect(calls.map(([name]) => name)).not.toContain("clip");
  });
});
