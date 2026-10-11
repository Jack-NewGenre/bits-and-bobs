import { FabricImage } from "fabric";
import { describe, expect, it, vi } from "vitest";

import { isStyled, styleReach } from "@/lib/image/editor/style-render";

vi.mock("@/lib/image/editor/raster", () => ({
  blankCanvas: (width: number, height: number) =>
    Object.assign(document.createElement("canvas"), { width, height }),
  readPixels: (_: unknown, width: number, height: number) => ({
    data: new Uint8ClampedArray(width * height * 4).fill(255),
  }),
}));

function layer(layerStyles?: FabricImage["layerStyles"]) {
  const element = Object.assign(document.createElement("canvas"), {
    width: 20,
    height: 10,
  });
  return new FabricImage(element, { layerStyles });
}

describe("isStyled", () => {
  it("is false with no styles or only switched-off ones", () => {
    expect(isStyled(undefined)).toBe(false);
    expect(isStyled({ dropShadow: { size: 40 } })).toBe(false);
  });

  it("is true once any style is on", () => {
    expect(isStyled({ stroke: { enabled: true } })).toBe(true);
  });
});

describe("styled image layers", () => {
  it("leave unstyled layers alone", () => {
    const plain = layer();
    expect(styleReach(plain)).toBe(0);
    expect(plain.needsItsOwnCache()).toBe(false);
  });

  it("cache themselves, padded to fit the styles", () => {
    const styled = layer({
      stroke: { enabled: true, size: 6, position: "outside" },
    });
    const reach = styleReach(styled);
    expect(reach).toBeGreaterThanOrEqual(6);
    expect(styled.needsItsOwnCache()).toBe(true);

    const plain = layer()._getCacheCanvasDimensions();
    const padded = styled._getCacheCanvasDimensions();
    expect(padded.width - plain.width).toBeGreaterThanOrEqual(2 * reach);
    expect(padded.height - plain.height).toBeGreaterThanOrEqual(2 * reach);
  });

  it("redraw their cache when given new pixels", () => {
    const styled = layer({ stroke: { enabled: true } });
    styled.dirty = false;
    styled.setElement(
      Object.assign(document.createElement("canvas"), {
        width: 20,
        height: 10,
      }),
    );
    expect(styled.dirty).toBe(true);
  });
});
