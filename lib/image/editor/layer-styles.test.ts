import { describe, expect, it } from "vitest";

import {
  DEFAULT_LAYER_STYLES,
  hasStyles,
  type LayerStyles,
  renderLayerStyles,
  type StyleRasters,
  stylePadding,
  withStyleDefaults,
} from "@/lib/image/editor/layer-styles";

const SIZE = 40;

/** A SIZE × SIZE layer holding an opaque square from 10 to 29 on both axes. */
function square(): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let y = 10; y < 30; y++) {
    for (let x = 10; x < 30; x++)
      pixels.set([255, 255, 255, 255], (y * SIZE + x) * 4);
  }
  return pixels;
}

const render = (styles: Partial<LayerStyles>) =>
  renderLayerStyles(square(), SIZE, SIZE, {
    ...DEFAULT_LAYER_STYLES,
    ...styles,
  });

/** The RGBA at layer coordinates (x, y) of one raster. */
function at(
  rasters: StyleRasters,
  raster: Uint8ClampedArray | null,
  x: number,
  y: number,
) {
  if (!raster) throw new Error("missing raster");
  const o = ((y + rasters.padding) * rasters.width + x + rasters.padding) * 4;
  return Array.from(raster.subarray(o, o + 4));
}

const stroke = (position: "outside" | "inside" | "centre") => ({
  stroke: {
    ...DEFAULT_LAYER_STYLES.stroke,
    enabled: true,
    colour: "#ff0000",
    size: 3,
    position,
  },
});

describe("layer style settings", () => {
  it("fills missing fields from the defaults", () => {
    const styles = withStyleDefaults({ stroke: { enabled: true, size: 5 } });
    expect(styles.stroke).toEqual({
      ...DEFAULT_LAYER_STYLES.stroke,
      enabled: true,
      size: 5,
    });
    expect(styles.dropShadow).toEqual(DEFAULT_LAYER_STYLES.dropShadow);
    expect(withStyleDefaults(undefined)).toEqual(DEFAULT_LAYER_STYLES);
  });

  it("has no styles by default", () => {
    expect(hasStyles(DEFAULT_LAYER_STYLES)).toBe(false);
    expect(hasStyles(withStyleDefaults({ outerGlow: { enabled: true } }))).toBe(
      true,
    );
  });

  it("pads enough for every enabled effect", () => {
    expect(stylePadding(DEFAULT_LAYER_STYLES)).toBe(0);
    const shadow = withStyleDefaults({
      dropShadow: { enabled: true, size: 8, distance: 12 },
    });
    expect(stylePadding(shadow)).toBeGreaterThanOrEqual(20);
    const glow = withStyleDefaults({ outerGlow: { enabled: true, size: 15 } });
    expect(stylePadding(glow)).toBeGreaterThanOrEqual(15);
  });
});

describe("renderLayerStyles", () => {
  it("returns no rasters when nothing is enabled", () => {
    const rasters = renderLayerStyles(
      square(),
      SIZE,
      SIZE,
      DEFAULT_LAYER_STYLES,
    );
    expect(rasters).toMatchObject({ padding: 0, width: SIZE, height: SIZE });
    expect(rasters.behind).toBeNull();
    expect(rasters.front).toBeNull();
  });

  it("draws an outside stroke round the shape and nothing in front", () => {
    const rasters = render(stroke("outside"));
    expect(rasters.width).toBe(SIZE + 2 * rasters.padding);
    expect(rasters.front).toBeNull();
    expect(at(rasters, rasters.behind, 8, 20)).toEqual([255, 0, 0, 255]);
    expect(at(rasters, rasters.behind, 20, 31)).toEqual([255, 0, 0, 255]);
    expect(at(rasters, rasters.behind, 5, 20)[3]).toBe(0);
    expect(at(rasters, rasters.behind, 20, 34)[3]).toBe(0);
  });

  it("draws an inside stroke in front, clear deep inside", () => {
    const rasters = render(stroke("inside"));
    expect(rasters.behind).toBeNull();
    expect(at(rasters, rasters.front, 10, 20)).toEqual([255, 0, 0, 255]);
    expect(at(rasters, rasters.front, 12, 20)).toEqual([255, 0, 0, 255]);
    expect(at(rasters, rasters.front, 20, 20)[3]).toBe(0);
    expect(at(rasters, rasters.front, 8, 20)[3]).toBe(0);
  });

  it("splits a centre stroke either side of the edge", () => {
    const rasters = render({
      ...stroke("centre"),
      stroke: { ...stroke("centre").stroke, size: 4 },
    });
    expect(at(rasters, rasters.behind, 8, 20)[3]).toBe(255);
    expect(at(rasters, rasters.behind, 6, 20)[3]).toBe(0);
    expect(at(rasters, rasters.front, 11, 20)[3]).toBe(255);
    expect(at(rasters, rasters.front, 13, 20)[3]).toBe(0);
  });

  it("casts the drop shadow below right of a light at 120°", () => {
    const rasters = render({
      dropShadow: {
        ...DEFAULT_LAYER_STYLES.dropShadow,
        enabled: true,
        size: 2,
        distance: 8,
      },
    });
    expect(rasters.front).toBeNull();
    // 8 px at 120°: 4 right, 7 down, so the shadow covers 14–33 across and 17–36 down.
    const [r, g, b, a] = at(rasters, rasters.behind, 31, 30);
    expect([r, g, b]).toEqual([0, 0, 0]);
    expect(a).toBe(191);
    expect(at(rasters, rasters.behind, 36, 30)[3]).toBe(0);
    expect(at(rasters, rasters.behind, 12, 8)[3]).toBe(0);
    expect(at(rasters, rasters.behind, 7, 20)[3]).toBe(0);
  });

  it("surrounds the shape with an even glow", () => {
    const rasters = render({
      outerGlow: { ...DEFAULT_LAYER_STYLES.outerGlow, enabled: true },
    });
    const [left, right, top, bottom] = [
      at(rasters, rasters.behind, 7, 20),
      at(rasters, rasters.behind, 32, 20),
      at(rasters, rasters.behind, 20, 7),
      at(rasters, rasters.behind, 20, 32),
    ];
    expect(left.slice(0, 3)).toEqual([255, 255, 190]);
    expect(left[3]).toBeGreaterThan(0);
    expect(right).toEqual(left);
    expect(top).toEqual(left);
    expect(bottom).toEqual(left);
    expect(at(rasters, rasters.behind, -12, 20)[3]).toBe(0);
  });

  it("stacks the stroke over the shadow behind the layer", () => {
    const rasters = render({
      ...stroke("outside"),
      dropShadow: { ...DEFAULT_LAYER_STYLES.dropShadow, enabled: true },
    });
    expect(at(rasters, rasters.behind, 31, 31)).toEqual([255, 0, 0, 255]);
  });
});
