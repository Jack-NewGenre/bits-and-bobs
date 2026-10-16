import { describe, expect, it } from "vitest";

import { THEMES } from "@/lib/site";
import { THEME_OPTIONS } from "@/components/atoms/theme-toggle";

describe("THEME_OPTIONS", () => {
  it("offers every theme the provider knows, plus system", () => {
    expect(THEME_OPTIONS.map(({ value }) => value)).toEqual([...THEMES, "system"]);
  });
});
