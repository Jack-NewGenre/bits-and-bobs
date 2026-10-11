import { describe, expect, it } from "vitest";

import { backgroundColour } from "@/components/organisms/tools/favicon-generator/favicon-options";

const custom = { r: 1, g: 2, b: 3, a: 1 };

describe("backgroundColour", () => {
  it("leaves the icon transparent for none", () => {
    expect(backgroundColour("transparent", custom)).toBeUndefined();
  });

  it("maps the presets to their colours", () => {
    expect(backgroundColour("white", custom)).toEqual({
      r: 255,
      g: 255,
      b: 255,
      a: 1,
    });
    expect(backgroundColour("black", custom)).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 1,
    });
  });

  it("uses the custom colour for custom", () => {
    expect(backgroundColour("custom", custom)).toBe(custom);
  });
});
