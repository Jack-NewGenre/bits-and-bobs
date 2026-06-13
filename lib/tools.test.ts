import { describe, expect, it } from "vitest";

import {
  AVAILABLE_TOOLS,
  TOOLS,
  TOOL_CATEGORIES,
  getToolBySlug,
  getToolsByCategory,
} from "@/lib/tools";

const CATEGORY_IDS = TOOL_CATEGORIES.map((category) => category.id);

describe("tool registry", () => {
  it("has unique slugs", () => {
    const slugs = TOOLS.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("only references known categories", () => {
    for (const tool of TOOLS) {
      expect(CATEGORY_IDS).toContain(tool.category);
    }
  });

  it("gives every available tool a route, and no 'soon' tool a route", () => {
    for (const tool of TOOLS) {
      if (tool.status === "available") {
        expect(tool.href).toMatch(/^\/tools\//);
      } else {
        expect(tool.href).toBeUndefined();
      }
    }
  });

  it("includes the background remover as available", () => {
    const tool = getToolBySlug("background-removal");
    expect(tool?.status).toBe("available");
    expect(tool?.href).toBe("/tools/background-removal");
  });

  it("includes the image enhancer as available", () => {
    const tool = getToolBySlug("image-enhancer");
    expect(tool?.status).toBe("available");
    expect(tool?.href).toBe("/tools/image-enhancer");
  });

  it("AVAILABLE_TOOLS contains only available tools", () => {
    expect(AVAILABLE_TOOLS.every((tool) => tool.status === "available")).toBe(
      true,
    );
  });

  it("filters tools by category", () => {
    const imageTools = getToolsByCategory("image");
    expect(imageTools.length).toBeGreaterThan(0);
    expect(imageTools.every((tool) => tool.category === "image")).toBe(true);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getToolBySlug("does-not-exist")).toBeUndefined();
  });
});
