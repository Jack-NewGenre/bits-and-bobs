import type { LucideIcon } from "lucide-react";

export type ToolStatus = "available" | "soon";

export type ToolCategoryId =
  | "image"
  | "colour"
  | "dev"
  | "pdf"
  | "generators";

export interface ToolCategory {
  id: ToolCategoryId;
  name: string;
  description: string;
}

/** A route into the toolbox. Every tool page lives under `/tools`. */
export type ToolHref = `/tools/${string}`;

interface ToolBase {
  slug: string;
  name: string;
  /** One line, shown on the tool card and in the sidebar tooltip. */
  description: string;
  category: ToolCategoryId;
  icon: LucideIcon;
}

/** A tool that has been built and has a page behind it. */
export interface AvailableTool extends ToolBase {
  status: "available";
  href: ToolHref;
  /**
   * The longer sentence under the heading on the tool's own page. Required
   * here rather than on the page so all copy for a tool lives in one place.
   */
  blurb: string;
}

/** A tool on the roadmap. No page, so no route and no page copy. */
export interface SoonTool extends ToolBase {
  status: "soon";
  href?: never;
  blurb?: never;
}

/**
 * Discriminating on `status` is what keeps `href` honest: an available tool
 * always has a route, a "soon" tool can never accidentally be given one.
 */
export type Tool = AvailableTool | SoonTool;
