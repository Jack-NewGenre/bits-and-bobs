import { describe, expect, it } from "vitest";

import { colourName, describeColour } from "@/lib/colour/colour-atlas";
import { parseColour } from "@/lib/colour/colour-format";
import type { Rgb } from "@/lib/colour/colour";

function colour(text: string): Rgb {
  const parsed = parseColour(text);
  if (!parsed) throw new Error(`Bad colour ${text}`);
  return parsed;
}

describe("colourName", () => {
  it.each([
    ["#ff0000", "red"],
    ["#ffa500", "orange"],
    ["#ffff00", "yellow"],
    ["#008000", "green"],
    ["#00ffff", "cyan"],
    ["#3b82f6", "blue"],
    ["#8a2be2", "violet"],
    ["#ff00ff", "purple"],
    ["#ec4899", "pink"],
    ["#ff1493", "pink"],
  ])("names %s %s", (hex, name) => {
    expect(colourName(colour(hex))).toBe(name);
  });

  it("names greys by lightness alone", () => {
    expect(colourName(colour("#ffffff"))).toBe("white");
    expect(colourName(colour("#000000"))).toBe("black");
    expect(colourName(colour("#808080"))).toBe("grey");
    expect(colourName(colour("#333333"))).toBe("dark grey");
    expect(colourName(colour("#d4d4d4"))).toBe("light grey");
  });

  it("adds dark, light and muted where they fit", () => {
    expect(colourName(colour("#000080"))).toBe("dark blue");
    expect(colourName(colour("#ffc0cb"))).toBe("light pink");
    expect(colourName(colour("#008080"))).toBe("cyan");
    expect(colourName(colour("#d2b48c"))).toBe("muted orange");
  });

  it("calls darkened orange brown and darkened yellow olive", () => {
    expect(colourName(colour("#8b4513"))).toBe("brown");
    expect(colourName(colour("#808000"))).toBe("olive");
  });
});

describe("describeColour", () => {
  it("collects the name, OKLCH, luminance and best text colour", () => {
    const facts = describeColour(colour("#3b82f6"));
    expect(facts.name).toBe("blue");
    expect(facts.oklch.h).toBeCloseTo(259.8, 0);
    expect(facts.luminance).toBeGreaterThan(0.2);
    expect(facts.textOn).toBe("black");
    expect(describeColour(colour("#000080")).textOn).toBe("white");
  });
});
