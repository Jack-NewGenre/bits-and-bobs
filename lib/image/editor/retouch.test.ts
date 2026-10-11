import { describe, expect, it } from "vitest";

import {
  dodgeBurn,
  luma,
  toneCurve,
  toneImage,
} from "@/lib/image/editor/retouch";

describe("toneCurve", () => {
  it("leaves black and white alone for midtones", () => {
    for (const burn of [false, true]) {
      expect(toneCurve(0, 1, "midtones", burn)).toBe(0);
      expect(toneCurve(1, 1, "midtones", burn)).toBe(1);
    }
  });

  it("dodges lighter and burns darker", () => {
    expect(toneCurve(0.5, 0.5, "midtones", false)).toBeGreaterThan(0.5);
    expect(toneCurve(0.5, 0.5, "midtones", true)).toBeLessThan(0.5);
  });

  it("moves the chosen end of the scale most", () => {
    const darkLift = toneCurve(0.1, 1, "shadows", false) - 0.1;
    const lightLift = toneCurve(0.9, 1, "shadows", false) - 0.9;
    expect(darkLift).toBeGreaterThan(lightLift);
    const lightDrop = 0.9 - toneCurve(0.9, 1, "highlights", true);
    const darkDrop = 0.1 - toneCurve(0.1, 1, "highlights", true);
    expect(lightDrop).toBeGreaterThan(darkDrop);
  });

  it("does nothing at zero strength", () => {
    expect(toneCurve(0.3, 0, "shadows", false)).toBeCloseTo(0.3);
  });
});

describe("dodgeBurn", () => {
  it("keeps the hue when protecting tones", () => {
    const [r, g, b] = dodgeBurn([0.6, 0.3, 0.15], {
      strength: 0.5,
      range: "midtones",
      burn: false,
      protectTones: true,
    });
    expect(r / g).toBeCloseTo(2, 1);
    expect(luma(r, g, b)).toBeGreaterThan(luma(0.6, 0.3, 0.15));
  });

  it("never leaves the 0–1 range", () => {
    const out = dodgeBurn([1, 0.9, 0], {
      strength: 1,
      range: "highlights",
      burn: false,
      protectTones: true,
    });
    out.forEach((channel) => {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(1);
    });
  });
});

describe("toneImage", () => {
  it("burns every pixel and keeps alpha", () => {
    const data = new Uint8ClampedArray([128, 128, 128, 200, 64, 64, 64, 255]);
    toneImage(data, {
      strength: 0.5,
      range: "midtones",
      burn: true,
      protectTones: false,
    });
    expect(data[0]).toBeLessThan(128);
    expect(data[3]).toBe(200);
    expect(data[4]).toBeLessThan(64);
  });
});
