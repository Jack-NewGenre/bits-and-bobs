/** Lookup helpers over the tool catalogue. */

import { TOOL_CATEGORIES, TOOLS } from "@/lib/tool-registry";
import { FEATURED_TOOL_SLUGS } from "@/lib/tool-registry/featured";
import type { AvailableTool, Tool, ToolCategoryId } from "@/lib/types";

export { TOOL_CATEGORIES, TOOLS } from "@/lib/tool-registry";

/** Narrows a catalogue entry to one that has a page, and therefore a route. */
export function isAvailable(tool: Tool): tool is AvailableTool {
  return tool.status === "available";
}

export function getToolsByCategory(category: ToolCategoryId): Tool[] {
  return TOOLS.filter((tool) => tool.category === category);
}

export function getToolBySlug(slug: string): Tool | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}

/**
 * The strict lookup used by tool pages. Throwing rather than returning
 * undefined means a page pointed at a missing or "soon" slug fails the build
 * instead of quietly rendering a 404 in production.
 */
export function getAvailableTool(slug: string): AvailableTool {
  const tool = getToolBySlug(slug);

  if (!tool) {
    throw new Error(`No tool is registered for the slug "${slug}".`);
  }

  if (!isAvailable(tool)) {
    throw new Error(
      `The tool "${slug}" is marked "soon", so it must not have a page. Set its status to "available" and give it an href and a blurb.`,
    );
  }

  return tool;
}

export const AVAILABLE_TOOLS: AvailableTool[] = TOOLS.filter(isAvailable);

/** Resolved strictly, so a featured slug that is renamed or "soon" fails the build. */
export const FEATURED_TOOLS: AvailableTool[] = FEATURED_TOOL_SLUGS.map((slug) =>
  getAvailableTool(slug),
);

const CATEGORY_NAMES = new Map(
  TOOL_CATEGORIES.map(({ id, name }) => [id, name]),
);

/** The copy a search looks through besides the tool's name. */
export function toolKeywords(tool: AvailableTool): string[] {
  return [tool.description, tool.blurb, CATEGORY_NAMES.get(tool.category) ?? ""];
}

/**
 * How well a query matches, from 0 (not at all) up to 3. Every word of the
 * query must appear in the name or the keywords. A name that starts with the
 * query beats one that only contains a word of it, which beats a match buried
 * in the copy, so "pdf" leads with the PDF tools rather than whichever image
 * tool mentions PDFs in its blurb.
 */
export function matchScore(query: string, name: string, keywords: string[] = []): number {
  const normalised = query.trim().toLowerCase();
  if (!normalised) return 0;

  const words = normalised.split(/\s+/);
  const text = [name, ...keywords].join(" ").toLowerCase();
  if (!words.every((word) => text.includes(word))) return 0;

  const lowerName = name.toLowerCase();
  if (lowerName.startsWith(normalised)) return 3;
  return words.some((word) => lowerName.includes(word)) ? 2 : 1;
}

/** The tools matching a query, best first, ties kept in catalogue order. */
export function searchTools(
  query: string,
  tools: AvailableTool[] = AVAILABLE_TOOLS,
): AvailableTool[] {
  return tools
    .map((tool) => ({ tool, score: matchScore(query, tool.name, toolKeywords(tool)) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ tool }) => tool);
}

/** The tools that can open every one of these files, in catalogue order. */
export function toolsForFiles(
  files: File[],
  tools: AvailableTool[] = AVAILABLE_TOOLS,
): AvailableTool[] {
  if (files.length === 0) return [];
  return tools.filter(({ accepts }) =>
    files.every((file) => accepts?.includes(file.type)),
  );
}

/** "I'm feeling lucky": any tool, picked by a number in [0, 1). */
export function randomTool(
  roll: number = Math.random(),
  tools: AvailableTool[] = AVAILABLE_TOOLS,
): AvailableTool {
  return tools[Math.min(Math.floor(roll * tools.length), tools.length - 1)];
}
