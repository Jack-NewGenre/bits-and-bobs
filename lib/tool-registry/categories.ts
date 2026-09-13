/** The sections the toolbox is grouped into. */

import type { ToolCategory } from "@/lib/types";

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: "image",
    name: "Image",
    description: "Edit, convert and optimise images entirely in your browser.",
  },
  {
    id: "colour",
    name: "Colour",
    description:
      "Convert, compare and build colour, with perceptual maths under it.",
  },
  {
    id: "dev",
    name: "Dev & Text",
    description: "Everyday developer and text utilities.",
  },
  {
    id: "pdf",
    name: "PDF",
    description: "Combine, split and convert PDF documents.",
  },
  {
    id: "generators",
    name: "Generators",
    description: "Generate codes, secrets and placeholder content.",
  },
];
