import { describe, expect, it } from "vitest";

import { SEARCH_PROMPTS } from "@/lib/search-prompts";
import { searchTools } from "@/lib/tools";

describe("SEARCH_PROMPTS", () => {
  it("has unique labels", () => {
    const labels = SEARCH_PROMPTS.map((prompt) => prompt.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it.each(SEARCH_PROMPTS)("finds a tool for “$label”", ({ query }) => {
    expect(searchTools(query).length).toBeGreaterThan(0);
  });
});
