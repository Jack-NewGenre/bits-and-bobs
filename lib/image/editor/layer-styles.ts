/**
 * Layer style maths, adapted from PhotoCraft's `effects.rs` (MIT OR Apache-2.0,
 * see THIRD_PARTY_NOTICES.md). Builds Photoshop-style drop shadows, outer
 * glows and strokes from a layer's alpha as RGBA rasters the editor draws
 * behind and in front of the layer.
 */

import {
  boxBlur,
  distanceInside,
  distanceOutside,
  EMPTY,
} from "@/lib/image/editor/distance";
import { hexToRgba } from "@/lib/image/editor/pixels";

/** Colour "#rrggbb", opacity 0–100, angle in degrees the light comes from, sizes in px. */
export interface DropShadowStyle {
  enabled: boolean;
  colour: string;
  opacity: number;
  angle: number;
  distance: number;
  size: number;
  spread: number;
}

export interface OuterGlowStyle {
  enabled: boolean;
  colour: string;
  opacity: number;
  size: number;
  spread: number;
}

export type StrokePosition = "outside" | "centre" | "inside";

export interface StrokeStyle {
  enabled: boolean;
  colour: string;
  opacity: number;
  size: number;
  position: StrokePosition;
}

export interface LayerStyles {
  dropShadow: DropShadowStyle;
  outerGlow: OuterGlowStyle;
  stroke: StrokeStyle;
}

export type SavedLayerStyles = {
  [K in keyof LayerStyles]?: Partial<LayerStyles[K]>;
};

export const DEFAULT_LAYER_STYLES: LayerStyles = {
  dropShadow: {
    enabled: false,
    colour: "#000000",
    opacity: 75,
    angle: 120,
    distance: 10,
    size: 10,
    spread: 0,
  },
  outerGlow: {
    enabled: false,
    colour: "#ffffbe",
    opacity: 75,
    size: 10,
    spread: 0,
  },
  stroke: {
    enabled: false,
    colour: "#000000",
    opacity: 100,
    size: 3,
    position: "outside",
  },
};

/** Saved styles with every missing field taken from the defaults. */
export function withStyleDefaults(
  saved: SavedLayerStyles | undefined,
): LayerStyles {
  return {
    dropShadow: { ...DEFAULT_LAYER_STYLES.dropShadow, ...saved?.dropShadow },
    outerGlow: { ...DEFAULT_LAYER_STYLES.outerGlow, ...saved?.outerGlow },
    stroke: { ...DEFAULT_LAYER_STYLES.stroke, ...saved?.stroke },
  };
}

/** Whether any style is switched on. */
export function hasStyles(styles: LayerStyles): boolean {
  return (
    styles.dropShadow.enabled ||
    styles.outerGlow.enabled ||
    styles.stroke.enabled
  );
}

/** The stroke's (inside, outside) widths. */
function strokeWidths({ size, position }: StrokeStyle): [number, number] {
  const width = Math.max(0, size);
  if (position === "inside") return [width, 0];
  if (position === "centre") return [width / 2, width / 2];
  return [0, width];
}

/** Where the shadow falls: away from the light, rounded to whole pixels as Photoshop does. */
function shadowOffset({ angle, distance }: DropShadowStyle): [number, number] {
  const radians = (angle * Math.PI) / 180;
  return [
    Math.round(-Math.cos(radians) * distance),
    Math.round(Math.sin(radians) * distance),
  ];
}

/** Extra pixels needed on every side so no effect is clipped. */
export function stylePadding(styles: LayerStyles): number {
  const { dropShadow, outerGlow, stroke } = styles;
  const reaches = [
    dropShadow.enabled
      ? Math.max(0, dropShadow.size) + Math.abs(dropShadow.distance)
      : -1,
    outerGlow.enabled ? Math.max(0, outerGlow.size) : -1,
    // Even an inside stroke needs a clear ring, so a layer opaque to its bounds has an edge.
    stroke.enabled ? strokeWidths(stroke)[1] : -1,
  ];
  const reach = Math.max(...reaches);
  return reach < 0 ? 0 : Math.ceil(reach) + 1;
}

export interface StyleRasters {
  padding: number;
  /** Source size plus `2 * padding`. */
  width: number;
  height: number;
  /** RGBA beneath the layer: shadow, then glow, then the outside part of the stroke. */
  behind: Uint8ClampedArray | null;
  /** RGBA over the layer: the inside part of the stroke. */
  front: Uint8ClampedArray | null;
}

interface Paint {
  coverage: Float32Array;
  rgb: readonly number[];
  opacity: number;
  /** Where to read `coverage` from relative to each pixel (the shadow's offset). */
  dx: number;
  dy: number;
}

/** Lazily built distance fields of one padded shape. */
class Shape {
  private outside: Float32Array | null = null;
  private inside: Float32Array | null = null;

  constructor(
    readonly alpha: Float32Array,
    readonly width: number,
    readonly height: number,
  ) {}

  distanceOutside(): Float32Array {
    this.outside ??= distanceOutside(this.alpha, this.width, this.height);
    return this.outside;
  }

  distanceInside(): Float32Array {
    this.inside ??= distanceInside(this.alpha, this.width, this.height);
    return this.inside;
  }

  /** The shape grown by `r` px (anti-aliased), then blurred by `blur` px. */
  softened(r: number, blur: number): Float32Array {
    const out = Float32Array.from(this.alpha);
    if (r > 0) {
      const distance = this.distanceOutside();
      for (let i = 0; i < out.length; i++) {
        out[i] =
          out[i] > EMPTY
            ? Math.min(1, out[i] + r)
            : Math.min(1, Math.max(0, r + 0.5 - distance[i]));
      }
    }
    boxBlur(out, this.width, this.height, blur);
    return out;
  }
}

/** Splits a size into the hard choke the spread asks for and the blur left over. */
function spreadSplit(size: number, spread: number): [number, number] {
  const choke = Math.round((size * Math.min(100, Math.max(0, spread))) / 100);
  return [choke, Math.max(0, size - choke)];
}

function paintOf(
  colour: string,
  opacity: number,
  coverage: Float32Array,
  dx = 0,
  dy = 0,
): Paint {
  const rgb = hexToRgba(colour).slice(0, 3);
  return {
    coverage,
    rgb,
    opacity: Math.min(100, Math.max(0, opacity)) / 100,
    dx,
    dy,
  };
}

/** Composites paints bottom to top with source-over, as straight RGBA. */
function composite(
  paints: Paint[],
  width: number,
  height: number,
): Uint8ClampedArray | null {
  if (paints.length === 0) return null;
  const premultiplied = new Float32Array(width * height * 4);
  for (const { coverage, rgb, opacity, dx, dy } of paints) {
    for (let y = Math.max(0, dy); y < Math.min(height, height + dy); y++) {
      for (let x = Math.max(0, dx); x < Math.min(width, width + dx); x++) {
        const k = coverage[(y - dy) * width + x - dx] * opacity;
        if (k <= 0) continue;
        const o = (y * width + x) * 4;
        const keep = 1 - k;
        premultiplied[o] = rgb[0] * k + premultiplied[o] * keep;
        premultiplied[o + 1] = rgb[1] * k + premultiplied[o + 1] * keep;
        premultiplied[o + 2] = rgb[2] * k + premultiplied[o + 2] * keep;
        premultiplied[o + 3] = k + premultiplied[o + 3] * keep;
      }
    }
  }
  const out = new Uint8ClampedArray(premultiplied.length);
  for (let o = 0; o < out.length; o += 4) {
    const a = premultiplied[o + 3];
    if (a <= 0) continue;
    out[o] = premultiplied[o] / a;
    out[o + 1] = premultiplied[o + 1] / a;
    out[o + 2] = premultiplied[o + 2] / a;
    out[o + 3] = a * 255;
  }
  return out;
}

/** The layer's alpha (0–1) placed in a canvas grown by `padding` on every side. */
function paddedAlpha(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  padding: number,
) {
  const outWidth = width + 2 * padding;
  const alpha = new Float32Array(outWidth * (height + 2 * padding));
  for (let y = 0; y < height; y++) {
    const row = (y + padding) * outWidth + padding;
    for (let x = 0; x < width; x++)
      alpha[row + x] = pixels[(y * width + x) * 4 + 3] / 255;
  }
  return alpha;
}

/** Builds the effect rasters from the layer's RGBA pixels (only alpha matters). */
export function renderLayerStyles(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  styles: LayerStyles,
): StyleRasters {
  const padding = stylePadding(styles);
  const [outWidth, outHeight] = [width + 2 * padding, height + 2 * padding];
  const rasters = {
    padding,
    width: outWidth,
    height: outHeight,
    behind: null,
    front: null,
  };
  if (!hasStyles(styles)) return rasters;

  const shape = new Shape(
    paddedAlpha(pixels, width, height, padding),
    outWidth,
    outHeight,
  );
  const { dropShadow, outerGlow, stroke } = styles;
  const behind: Paint[] = [];
  const front: Paint[] = [];

  if (dropShadow.enabled) {
    const [choke, blur] = spreadSplit(dropShadow.size, dropShadow.spread);
    const [dx, dy] = shadowOffset(dropShadow);
    const coverage = shape.softened(choke, blur);
    behind.push(
      paintOf(dropShadow.colour, dropShadow.opacity, coverage, dx, dy),
    );
  }

  if (outerGlow.enabled) {
    const [choke, blur] = spreadSplit(outerGlow.size, outerGlow.spread);
    const coverage = shape.softened(choke, blur);
    // Photoshop's default 50 % range doubles the glow, so a blurred edge's half is full strength.
    for (let i = 0; i < coverage.length; i++)
      coverage[i] = Math.min(1, coverage[i] * 2);
    behind.push(paintOf(outerGlow.colour, outerGlow.opacity, coverage));
  }

  const [insideWidth, outsideWidth] = stroke.enabled
    ? strokeWidths(stroke)
    : [0, 0];
  if (outsideWidth > 0) {
    const distance = shape.distanceOutside();
    const coverage = new Float32Array(distance.length);
    for (let i = 0; i < coverage.length; i++) {
      coverage[i] = Math.min(1, Math.max(0, outsideWidth + 0.5 - distance[i]));
    }
    behind.push(paintOf(stroke.colour, stroke.opacity, coverage));
  }
  if (insideWidth > 0) {
    const distance = shape.distanceInside();
    const coverage = new Float32Array(distance.length);
    for (let i = 0; i < coverage.length; i++) {
      const alpha = shape.alpha[i];
      if (alpha <= EMPTY) continue;
      coverage[i] =
        Math.min(1, Math.max(0, insideWidth + 0.5 - distance[i])) *
        Math.min(1, alpha);
    }
    front.push(paintOf(stroke.colour, stroke.opacity, coverage));
  }

  return {
    ...rasters,
    behind: composite(behind, outWidth, outHeight),
    front: composite(front, outWidth, outHeight),
  };
}
