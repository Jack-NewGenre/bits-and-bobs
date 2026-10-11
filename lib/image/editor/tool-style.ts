/** The settings the tools draw with, shown in the tool options panel. */

import type { MaskMode } from "@/lib/image/editor/pixels";
import type { ToneRange } from "@/lib/image/editor/retouch";
import type { ShapeKind } from "@/lib/image/editor/shapes";
import { DEFAULT_FONT } from "@/lib/image/editor/text";

export type MarqueeShape = "rect" | "ellipse";
export type LassoKind = "freehand" | "magnetic";
export type GradientKind = "linear" | "radial";
export type ToneMode = "dodge" | "burn";
export type CloneAlign = "aligned" | "restart";
export type CloneSample = "all" | "layer";

export interface ToolStyle {
  /** Shapes and text. */
  fill: string;
  stroke: string;
  strokeWidth: number;
  shape: ShapeKind;
  cornerRadius: number;
  sides: number;
  fontSize: number;
  fontFamily: string;
  /** Brushes, the fill bucket and gradients. */
  brushColour: string;
  secondaryColour: string;
  brushSize: number;
  /** 0–100. */
  brushOpacity: number;
  /** 0–100: how crisp a brush's edge is. */
  brushHardness: number;
  /** Fill bucket and magic wand: 0–255 per channel. */
  tolerance: number;
  /** Selections. */
  selectionMode: MaskMode;
  marquee: MarqueeShape;
  /** Magnetic follows the strongest edges as you trace, like Photoshop's Magnetic Lasso. */
  lasso: LassoKind;
  gradient: GradientKind;
  /** Dodge lightens, burn darkens, by `toneStrength` (0–100). */
  tone: ToneMode;
  toneStrength: number;
  /** Dodge and burn: which part of the tonal scale moves most. */
  toneRange: ToneRange;
  /** Dodge and burn: change brightness only, so hue and saturation hold. */
  protectTones: boolean;
  /** Clone stamp: keep one offset for every stroke, or restart each stroke from the source. */
  cloneAlign: CloneAlign;
  /** Clone stamp: copy what is visible, or only the layer being painted. */
  cloneSample: CloneSample;
}

export const DEFAULT_TOOL_STYLE: ToolStyle = {
  fill: "#6366f1",
  stroke: "#111827",
  strokeWidth: 0,
  shape: "rect",
  cornerRadius: 0,
  sides: 5,
  fontSize: 64,
  fontFamily: DEFAULT_FONT,
  brushColour: "#111827",
  secondaryColour: "#ffffff",
  brushSize: 12,
  brushOpacity: 100,
  brushHardness: 100,
  tolerance: 32,
  selectionMode: "replace",
  marquee: "rect",
  lasso: "freehand",
  gradient: "linear",
  tone: "dodge",
  toneStrength: 30,
  toneRange: "midtones",
  protectTones: true,
  cloneAlign: "aligned",
  cloneSample: "all",
};

/**
 * How far a soft brush's edge blurs, in pixels. A hard brush has none; a
 * fully soft one fades over half its width.
 */
export function brushSoftness(size: number, hardness: number): number {
  return Math.round(
    ((100 - Math.min(100, Math.max(0, hardness))) / 100) * (size / 2),
  );
}

/**
 * The style change that flips a tool to its other kind, as Shift and the
 * tool's letter cycle a tool group in Photoshop.
 */
export function toggleVariant(
  tool: string,
  style: ToolStyle,
): Partial<ToolStyle> {
  if (tool === "marquee")
    return { marquee: style.marquee === "rect" ? "ellipse" : "rect" };
  if (tool === "lasso")
    return { lasso: style.lasso === "freehand" ? "magnetic" : "freehand" };
  if (tool === "tone")
    return { tone: style.tone === "dodge" ? "burn" : "dodge" };
  return {};
}

/** Holding Alt or Shift while selecting adds to or takes from the selection, as in Photoshop. */
export function selectionModeFor(
  base: MaskMode,
  event: { shiftKey: boolean; altKey: boolean },
): MaskMode {
  if (event.shiftKey) return "add";
  if (event.altKey) return "subtract";
  return base;
}
