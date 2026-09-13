/** Lookup helpers over the tool catalogue. */

import { TOOLS } from "@/lib/tool-registry";
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
