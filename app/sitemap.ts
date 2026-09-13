import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";
import { AVAILABLE_TOOLS } from "@/lib/tools";

/**
 * Generated from the catalogue, so a new tool is listed the moment it is
 * registered and a tool still marked "soon" is never advertised.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/changelog"),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    ...AVAILABLE_TOOLS.map((tool) => ({
      url: absoluteUrl(tool.href),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
