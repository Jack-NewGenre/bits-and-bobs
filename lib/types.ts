import type { LucideIcon } from "lucide-react";

export type ToolStatus = "available" | "soon";

export type ToolCategoryId = "image" | "dev" | "pdf" | "generators";

export interface ToolCategory {
  id: ToolCategoryId;
  name: string;
  description: string;
}

export interface Tool {
  slug: string;
  name: string;
  description: string;
  category: ToolCategoryId;
  icon: LucideIcon;
  status: ToolStatus;
  /** Route href. Only set for available tools. */
  href?: string;
}
