import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AVAILABLE_TOOLS,
  TOOLS,
  TOOL_CATEGORIES,
  getAvailableTool,
  getToolBySlug,
  getToolsByCategory,
  isAvailable,
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
        expect(tool.href).toBe(`/tools/${tool.slug}`);
      } else {
        expect(tool.href).toBeUndefined();
      }
    }
  });

  it("gives every available tool card copy and page copy", () => {
    for (const tool of AVAILABLE_TOOLS) {
      expect(tool.name.length).toBeGreaterThan(0);
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.blurb.length).toBeGreaterThan(0);
    }
  });

  it("has a page on disk for every available tool", () => {
    for (const tool of AVAILABLE_TOOLS) {
      const page = resolve(process.cwd(), `app${tool.href}/page.tsx`);
      expect(existsSync(page), `missing page for ${tool.slug}`).toBe(true);
    }
  });

  it("has a registry entry for every page on disk", () => {
    for (const tool of TOOLS) {
      if (isAvailable(tool)) continue;
      const page = resolve(process.cwd(), `app/tools/${tool.slug}/page.tsx`);
      expect(existsSync(page), `${tool.slug} is "soon" but has a page`).toBe(
        false,
      );
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
    expect(AVAILABLE_TOOLS.every(isAvailable)).toBe(true);
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

describe("getAvailableTool", () => {
  it("returns the entry for a built tool", () => {
    expect(getAvailableTool("uuid").href).toBe("/tools/uuid");
  });

  it("throws for an unknown slug, so the build fails instead of the page", () => {
    expect(() => getAvailableTool("does-not-exist")).toThrow(
      /No tool is registered/,
    );
  });

  it("throws for a tool that is still 'soon'", () => {
    const planned = TOOLS.find((tool) => tool.status === "soon");
    if (!planned) return; // Everything on the roadmap has shipped.
    expect(() => getAvailableTool(planned.slug)).toThrow(/marked "soon"/);
  });
});
