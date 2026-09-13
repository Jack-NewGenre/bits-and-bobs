/**
 * The catalogue itself, one file per section.
 *
 * Kept apart from the lookup helpers in `lib/tools` so that adding a tool is
 * a change to a list of data and nothing else.
 */

import { IMAGE_TOOLS } from "@/lib/tool-registry/image";
import { COLOUR_TOOLS } from "@/lib/tool-registry/colour";
import { DEV_TOOLS } from "@/lib/tool-registry/dev";
import { PDF_TOOLS } from "@/lib/tool-registry/pdf";
import { GENERATORS_TOOLS } from "@/lib/tool-registry/generators";
import type { Tool } from "@/lib/types";

export { TOOL_CATEGORIES } from "@/lib/tool-registry/categories";

/** Ordered to match TOOL_CATEGORIES, which is the order the home page shows. */
export const TOOLS: Tool[] = [
  ...IMAGE_TOOLS,
  ...COLOUR_TOOLS,
  ...DEV_TOOLS,
  ...PDF_TOOLS,
  ...GENERATORS_TOOLS,
];
