import { describe, expect, it } from "vitest";

import {
  VISION_MODES,
  simulateColour,
  simulatePixels,
  simulatedName,
  visionMode,
} from "@/lib/colour/colour-blindness";

const RED = { r: 255, g: 0, b: 0, a: 1 };
const GREEN = { r: 0, g: 255, b: 0, a: 1 };
const BLUE = { r: 0, g: 0, b: 255, a: 1 };
const GREY = { r: 128, g: 128, b: 128, a: 1 };

const matrixFor = (id: string) => visionMode(id as never).matrix;

describe("visionMode", () => {
  it("finds each mode by id", () => {
    for (const mode of VISION_MODES) {
      expect(visionMode(mode.id).label).toBe(mode.label);
    }
  });

  it("falls back to normal vision for anything unknown", () => {
    expect(visionMode("nonsense" as never).id).toBe("normal");
  });
});

describe("simulateColour", () => {
  it("leaves everything untouched for normal vision", () => {
    for (const colour of [RED, GREEN, BLUE, GREY]) {
      const simulated = simulateColour(colour, matrixFor("normal"));
      expect(simulated.r).toBeCloseTo(colour.r, -0.5);
      expect(simulated.g).toBeCloseTo(colour.g, -0.5);
      expect(simulated.b).toBeCloseTo(colour.b, -0.5);
    }
  });

  it("brings red and green together for deuteranopia", () => {
    const matrix = matrixFor("deuteranopia");
    const red = simulateColour(RED, matrix);
    const green = simulateColour(GREEN, matrix);

    const before = Math.abs(RED.r - GREEN.r) + Math.abs(RED.g - GREEN.g);
    const after = Math.abs(red.r - green.r) + Math.abs(red.g - green.g);
    expect(after).toBeLessThan(before);
  });

  it("darkens red sharply for protanopia", () => {
    expect(simulateColour(RED, matrixFor("protanopia")).r).toBeLessThan(255);
  });

  it("shifts blue for tritanopia but not red", () => {
    const matrix = matrixFor("tritanopia");
    expect(simulateColour(BLUE, matrix).g).toBeGreaterThan(0);
    expect(simulateColour(RED, matrix).r).toBeGreaterThan(200);
  });

  it("flattens everything to one grey level for achromatopsia", () => {
    const matrix = matrixFor("achromatopsia");
    for (const colour of [RED, GREEN, BLUE]) {
      const { r, g, b } = simulateColour(colour, matrix);
      expect(r).toBe(g);
      expect(g).toBe(b);
    }
  });

  it("leaves a neutral grey neutral under every simulation", () => {
    for (const mode of VISION_MODES) {
      const { r, g, b } = simulateColour(GREY, mode.matrix);
      expect(Math.abs(r - g)).toBeLessThanOrEqual(1);
      expect(Math.abs(g - b)).toBeLessThanOrEqual(1);
    }
  });

  it("keeps alpha", () => {
    expect(simulateColour({ ...RED, a: 0.4 }, matrixFor("protanopia")).a).toBe(
      0.4,
    );
  });
});

describe("simulatePixels", () => {
  it("matches the single-colour path", () => {
    const matrix = matrixFor("deuteranopia");
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 128]);
    simulatePixels(data, matrix);

    const red = simulateColour(RED, matrix);
    expect(Math.abs(data[0] - red.r)).toBeLessThanOrEqual(1);
    expect(Math.abs(data[1] - red.g)).toBeLessThanOrEqual(1);
  });

  it("never touches the alpha channel", () => {
    const data = new Uint8ClampedArray([10, 20, 30, 77, 40, 50, 60, 200]);
    simulatePixels(data, matrixFor("tritanopia"));
    expect(data[3]).toBe(77);
    expect(data[7]).toBe(200);
  });

  it("writes in place and returns the same buffer", () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255]);
    expect(simulatePixels(data, matrixFor("protanopia"))).toBe(data);
  });
});

describe("simulatedName", () => {
  it("tags the filename with the vision type and forces PNG", () => {
    expect(simulatedName("photo.jpg", "protanopia")).toBe(
      "photo-protanopia.png",
    );
  });
});
