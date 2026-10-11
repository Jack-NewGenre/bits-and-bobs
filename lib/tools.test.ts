import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  AVAILABLE_TOOLS,
  FEATURED_TOOLS,
  TOOLS,
  TOOL_CATEGORIES,
  getAvailableTool,
  getToolBySlug,
  getToolsByCategory,
  isAvailable,
  matchScore,
  randomTool,
  searchTools,
  toolsForFiles,
} from "@/lib/tools";
import { FEATURED_TOOL_SLUGS } from "@/lib/tool-registry/featured";

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

describe("FEATURED_TOOLS", () => {
  it("resolves every featured slug to an available tool, in order", () => {
    expect(FEATURED_TOOLS.map((tool) => tool.slug)).toEqual([
      ...FEATURED_TOOL_SLUGS,
    ]);
    expect(FEATURED_TOOLS.every(isAvailable)).toBe(true);
  });

  it("features each tool once and fills whole rows of three", () => {
    expect(new Set(FEATURED_TOOL_SLUGS).size).toBe(FEATURED_TOOL_SLUGS.length);
    expect(FEATURED_TOOL_SLUGS.length % 3).toBe(0);
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

describe("matchScore", () => {
  it("scores nothing for an empty query or a missing word", () => {
    expect(matchScore("", "Home")).toBe(0);
    expect(matchScore("home zzzz", "Home")).toBe(0);
  });

  it("ranks a name prefix over a name word over a keyword", () => {
    expect(matchScore("HOME", "Home")).toBe(3);
    expect(matchScore("theme", "Dark theme")).toBe(2);
    expect(matchScore("releases", "Changelog", ["what's new", "releases"])).toBe(1);
  });

  it("lets words match across the name and the keywords", () => {
    expect(matchScore("dark mode", "Dark theme", ["appearance", "mode"])).toBe(2);
  });
});

describe("searchTools", () => {
  const slugs = (query: string) => searchTools(query).map((tool) => tool.slug);

  it("returns nothing for an empty or blank query", () => {
    expect(searchTools("")).toEqual([]);
    expect(searchTools("   ")).toEqual([]);
  });

  it("matches on the name, ignoring case", () => {
    expect(slugs("UUID")).toContain("uuid");
  });

  it("matches on the description and category, not just the name", () => {
    expect(slugs("colour").length).toBeGreaterThan(1);
    expect(slugs("pdf")).toContain("pdf-merge");
  });

  it("needs every word to match", () => {
    expect(slugs("merge pdf")).toContain("pdf-merge");
    expect(slugs("merge zzzz")).toEqual([]);
  });

  it("puts name matches ahead of copy matches", () => {
    const results = searchTools("pdf");
    const firstCopyOnly = results.findIndex(
      (tool) => !tool.name.toLowerCase().includes("pdf"),
    );
    const lastNamed = results.findLastIndex((tool) =>
      tool.name.toLowerCase().includes("pdf"),
    );
    if (firstCopyOnly !== -1) expect(lastNamed).toBeLessThan(firstCopyOnly);
  });

  it("returns nothing for gibberish", () => {
    expect(searchTools("qwertyzxcv")).toEqual([]);
  });
});

describe("toolsForFiles", () => {
  const file = (type: string) => new File(["x"], "f", { type });
  const slugs = (files: File[]) =>
    toolsForFiles(files).map((tool) => tool.slug);

  it("offers the image tools for an image", () => {
    const found = slugs([file("image/png")]);
    expect(found).toContain("image-editor");
    expect(found).toContain("image-compressor");
    expect(found).not.toContain("pdf-merge");
  });

  it("offers the PDF tools for a PDF", () => {
    expect(slugs([file("application/pdf")])).toEqual([
      "pdf-merge",
      "pdf-split",
      "pdf-to-images",
    ]);
  });

  it("only offers SVG to the tools that take vector artwork", () => {
    expect(slugs([file("image/svg+xml")])).toEqual([
      "clip-art-cutter",
      "favicon-generator",
    ]);
  });

  it("needs a tool to accept every file in a mixed batch", () => {
    expect(slugs([file("image/png"), file("application/pdf")])).toEqual([]);
  });

  it("offers nothing for no files or an unknown type", () => {
    expect(slugs([])).toEqual([]);
    expect(slugs([file("text/plain")])).toEqual([]);
  });
});

describe("randomTool", () => {
  it("maps the roll across the whole catalogue", () => {
    expect(randomTool(0)).toBe(AVAILABLE_TOOLS[0]);
    expect(randomTool(0.999999)).toBe(AVAILABLE_TOOLS.at(-1));
  });

  it("always returns an available tool", () => {
    expect(isAvailable(randomTool())).toBe(true);
  });
});
