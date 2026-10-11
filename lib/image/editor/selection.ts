/** Reading and changing the properties of the selected layer. */

import { FabricImage, Point, Rect, Textbox, type FabricObject } from "fabric";

import {
  buildFilters,
  withDefaults,
  type Adjustments,
} from "@/lib/image/editor/adjustments";
import type { EditorDocument } from "@/lib/image/editor/document";
import {
  withStyleDefaults,
  type LayerStyles,
} from "@/lib/image/editor/layer-styles";
import type { LayerKind } from "@/lib/image/editor/layers";
import type { TextAlign } from "@/lib/image/editor/text";

export interface TextProps {
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: TextAlign;
  /** Thousandths of an em, as Fabric counts it. */
  letterSpacing: number;
  lineHeight: number;
}

export interface SelectionProps {
  id: string;
  name: string;
  kind: LayerKind;
  /** 0–100. */
  opacity: number;
  blend: GlobalCompositeOperation;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  fontSize?: number;
  text?: TextProps;
  adjustments?: Adjustments;
  layerStyles?: LayerStyles;
  masked: boolean;
  clipped: boolean;
}

export type StylePatch = Partial<
  Pick<
    SelectionProps,
    | "opacity"
    | "blend"
    | "fill"
    | "stroke"
    | "strokeWidth"
    | "cornerRadius"
    | "fontSize"
  > &
    TextProps
>;

export type TransformOp =
  "flip-x" | "flip-y" | "rotate-cw" | "rotate-ccw" | "centre";

function colourOf(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function describeText(text: Textbox): TextProps {
  return {
    fontFamily: text.fontFamily,
    bold: text.fontWeight === "bold" || Number(text.fontWeight) >= 600,
    italic: text.fontStyle === "italic",
    underline: text.underline,
    align: (text.textAlign as TextAlign) ?? "left",
    letterSpacing: text.charSpacing,
    lineHeight: text.lineHeight,
  };
}

/** A snapshot of one layer's editable properties, for the properties panel. */
export function describeSelection(object: FabricObject): SelectionProps {
  const kind = object.layerKind ?? "image";
  const shaped = kind === "rect" || kind === "ellipse" || kind === "polygon";
  const hasFill = shaped || kind === "text";
  const hasStroke = shaped || kind === "line";
  return {
    id: object.layerId ?? "",
    name: object.layerName ?? "Layer",
    kind,
    opacity: Math.round(object.opacity * 100),
    blend: object.globalCompositeOperation,
    masked: Boolean(object.maskSrc),
    clipped: Boolean(object.clipped),
    ...(hasFill && { fill: colourOf(object.fill) ?? "#000000" }),
    ...(hasStroke && {
      stroke: colourOf(object.stroke) ?? "#000000",
      strokeWidth: object.strokeWidth,
    }),
    ...(object instanceof Rect && { cornerRadius: object.rx }),
    ...(object instanceof Textbox && {
      fontSize: object.fontSize,
      text: describeText(object),
    }),
    ...(object instanceof FabricImage && {
      adjustments: withDefaults(object.adjustments),
      layerStyles: withStyleDefaults(object.layerStyles),
    }),
  };
}

function applyTextStyle(text: Textbox, patch: StylePatch): void {
  const {
    fontSize,
    fontFamily,
    bold,
    italic,
    underline,
    align,
    letterSpacing,
    lineHeight,
  } = patch;
  text.set({
    ...(fontSize !== undefined && { fontSize }),
    ...(fontFamily !== undefined && { fontFamily }),
    ...(bold !== undefined && { fontWeight: bold ? "bold" : "normal" }),
    ...(italic !== undefined && { fontStyle: italic ? "italic" : "normal" }),
    ...(underline !== undefined && { underline }),
    ...(align !== undefined && { textAlign: align }),
    ...(letterSpacing !== undefined && { charSpacing: letterSpacing }),
    ...(lineHeight !== undefined && { lineHeight }),
  });
  // Fabric caches glyph widths per font, so a new font or weight needs measuring again.
  text.initDimensions();
}

export function applyStyle(object: FabricObject, patch: StylePatch): void {
  const { opacity, blend, fill, stroke, strokeWidth, cornerRadius } = patch;
  object.set({
    ...(opacity !== undefined && { opacity: opacity / 100 }),
    ...(blend !== undefined && { globalCompositeOperation: blend }),
    ...(fill !== undefined && { fill }),
    ...(stroke !== undefined && { stroke }),
    ...(strokeWidth !== undefined && { strokeWidth }),
  });
  if (cornerRadius !== undefined && object instanceof Rect) {
    object.set({ rx: cornerRadius, ry: cornerRadius });
  }
  if (object instanceof Textbox) applyTextStyle(object, patch);
  object.setCoords();
}

export function applyAdjustments(
  object: FabricObject,
  adjustments: Adjustments,
): void {
  if (!(object instanceof FabricImage)) return;
  object.set({ adjustments });
  object.filters = buildFilters(adjustments);
  object.applyFilters();
}

export function applyLayerStyles(
  object: FabricObject,
  layerStyles: LayerStyles,
): void {
  if (object instanceof FabricImage) object.set({ layerStyles, dirty: true });
}

export function applyTransform(
  object: FabricObject,
  op: TransformOp,
  doc: EditorDocument,
): void {
  const centre = object.getCenterPoint();
  if (op === "flip-x") object.set({ flipX: !object.flipX });
  if (op === "flip-y") object.set({ flipY: !object.flipY });
  if (op === "rotate-cw" || op === "rotate-ccw") {
    object.rotate((object.angle + (op === "rotate-cw" ? 90 : -90) + 360) % 360);
  }
  const target =
    op === "centre" ? new Point(doc.width / 2, doc.height / 2) : centre;
  object.setPositionByOrigin(target, "center", "center");
  object.setCoords();
}
