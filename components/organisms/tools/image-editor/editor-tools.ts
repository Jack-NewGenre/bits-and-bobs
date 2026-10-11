import {
  ArrowRight,
  Bandage,
  Blend,
  Brush,
  Circle,
  Crop,
  Eraser,
  Hand,
  Lasso,
  MousePointer2,
  PaintBucket,
  Pentagon,
  Pipette,
  Shapes,
  Slash,
  Square,
  SquareDashed,
  Stamp,
  Star,
  SunMoon,
  Triangle,
  Type,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

import type { ShapeKind } from "@/lib/image/editor/shapes";
import type { EditorTool } from "@/lib/image/editor/shortcuts";

export interface ToolInfo {
  tool: EditorTool;
  label: string;
  icon: LucideIcon;
  hint: string;
}

/** The tools in dock order, grouped as Photoshop groups them. */
export const TOOL_GROUPS: readonly (readonly ToolInfo[])[] = [
  [
    { tool: "select", label: "Move", icon: MousePointer2, hint: "" },
    { tool: "hand", label: "Pan", icon: Hand, hint: "" },
  ],
  [
    {
      tool: "marquee",
      label: "Marquee",
      icon: SquareDashed,
      hint: "Drag to select. Shift adds to the selection, Alt takes away.",
    },
    {
      tool: "lasso",
      label: "Lasso",
      icon: Lasso,
      hint: "Draw round an area to select it. Shift adds, Alt takes away.",
    },
    {
      tool: "wand",
      label: "Magic wand",
      icon: WandSparkles,
      hint: "Click to select an area of similar colour. Shift adds, Alt takes away.",
    },
    {
      tool: "crop",
      label: "Crop",
      icon: Crop,
      hint: "Drag a box to crop the canvas to. Shift keeps it square.",
    },
  ],
  [
    {
      tool: "eyedropper",
      label: "Eyedropper",
      icon: Pipette,
      hint: "Click to pick up a colour. Hold Alt to set the second colour.",
    },
    {
      tool: "brush",
      label: "Brush",
      icon: Brush,
      hint: "Paints on the selected layer, or starts a new one when nothing is selected.",
    },
    {
      tool: "eraser",
      label: "Eraser",
      icon: Eraser,
      hint: "Erases pixels from the selected layer.",
    },
    {
      tool: "fill",
      label: "Fill",
      icon: PaintBucket,
      hint: "Click to fill an area of similar colour, on the selected layer or a new one.",
    },
    {
      tool: "gradient",
      label: "Gradient",
      icon: Blend,
      hint: "Drag to fill the selection, or the canvas, with a gradient between your two colours.",
    },
    {
      tool: "clone",
      label: "Clone stamp",
      icon: Stamp,
      hint: "Alt-click where to copy from, then paint to copy it onto the selected layer.",
    },
    {
      tool: "heal",
      label: "Healing brush",
      icon: Bandage,
      hint: "Alt-click where to copy from, then paint over a flaw. The copy takes on the colour and lighting around it.",
    },
    {
      tool: "tone",
      label: "Dodge and burn",
      icon: SunMoon,
      hint: "Paint to lighten or darken the selected layer.",
    },
  ],
  [
    {
      tool: "text",
      label: "Text",
      icon: Type,
      hint: "Click the canvas to place text. Double-click text to edit it.",
    },
    {
      tool: "shape",
      label: "Shape",
      icon: Shapes,
      hint: "Drag to draw. Hold Shift to keep its proportions.",
    },
  ],
];

export const TOOL_INFO = Object.fromEntries(
  TOOL_GROUPS.flat().map((info) => [info.tool, info]),
) as Record<EditorTool, ToolInfo>;

export const SHAPE_ICONS: Record<ShapeKind, LucideIcon> = {
  rect: Square,
  ellipse: Circle,
  line: Slash,
  triangle: Triangle,
  polygon: Pentagon,
  star: Star,
  arrow: ArrowRight,
};
