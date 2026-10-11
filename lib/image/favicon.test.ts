import { describe, expect, it, vi } from "vitest";

import {
  FAVICON_SIZES,
  ICO_FILENAME,
  buildIco,
  faviconEntries,
  faviconFilename,
  faviconRole,
  faviconSnippet,
  paintFavicon,
  sizeSvg,
  type Favicon,
} from "@/lib/image/favicon";

const favicons: Favicon[] = FAVICON_SIZES.map((size) => ({
  size,
  blob: new Blob([new Uint8Array([size % 256])], { type: "image/png" }),
}));

const parse = (text: string) =>
  new DOMParser().parseFromString(text, "image/svg+xml").documentElement;

describe("faviconFilename", () => {
  it("names the Apple touch icon the way iOS expects", () => {
    expect(faviconFilename(180)).toBe("apple-touch-icon.png");
  });

  it("names every other size by its dimensions", () => {
    expect(faviconFilename(32)).toBe("favicon-32x32.png");
  });
});

describe("faviconRole", () => {
  it("labels the platform sizes", () => {
    expect(faviconRole(16)).toBe("Browser");
    expect(faviconRole(180)).toBe("Apple touch");
    expect(faviconRole(192)).toBe("Android");
    expect(faviconRole(512)).toBe("PWA");
  });
});

describe("faviconSnippet", () => {
  it("links every file by the name it is saved under", () => {
    const snippet = faviconSnippet();

    expect(snippet).toContain(`href="/${ICO_FILENAME}" sizes="any"`);
    expect(snippet).toContain(
      'rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"',
    );
    expect(snippet).toContain('sizes="512x512" href="/favicon-512x512.png"');
    expect(snippet.split("\n")).toHaveLength(6);
  });
});

describe("sizeSvg", () => {
  it("sizes a viewBox-only SVG with its longer side at 512", () => {
    const svg = parse(
      sizeSvg(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"/>',
      )!,
    );

    expect(svg.getAttribute("width")).toBe("512");
    expect(svg.getAttribute("height")).toBe("256");
  });

  it("adds a viewBox from the size so scaling does not crop", () => {
    const svg = parse(
      sizeSvg(
        '<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24"/>',
      )!,
    );

    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(svg.getAttribute("width")).toBe("512");
  });

  it("falls back to a square when there is nothing to go on", () => {
    const svg = parse(
      sizeSvg(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"/>',
      )!,
    );

    expect(svg.getAttribute("width")).toBe("512");
    expect(svg.getAttribute("height")).toBe("512");
  });

  it("returns null for something that is not an SVG", () => {
    expect(sizeSvg("<html><body/></html>")).toBeNull();
  });
});

describe("buildIco", () => {
  it("packs only the small sizes", async () => {
    const view = new DataView(await (await buildIco(favicons)).arrayBuffer());

    expect(view.getUint16(4, true)).toBe(4);
    expect([0, 1, 2, 3].map((index) => view.getUint8(6 + 16 * index))).toEqual([
      16, 32, 48, 64,
    ]);
  });
});

describe("faviconEntries", () => {
  it("bundles the ICO with every PNG", async () => {
    const names = (await faviconEntries(favicons)).map(({ name }) => name);

    expect(names[0]).toBe(ICO_FILENAME);
    expect(names).toHaveLength(FAVICON_SIZES.length + 1);
    expect(names).toContain("apple-touch-icon.png");
  });
});

describe("paintFavicon", () => {
  const image = {} as HTMLImageElement;
  const crop = { x: 10, y: 20, side: 100 };

  function fakeContext() {
    const calls: string[] = [];
    const record = (name: string) => vi.fn(() => void calls.push(name));
    return {
      calls,
      ctx: {
        beginPath: record("beginPath"),
        roundRect: record("roundRect"),
        clip: record("clip"),
        fillRect: record("fillRect"),
        drawImage: record("drawImage"),
        fillStyle: "",
        imageSmoothingQuality: "low" as ImageSmoothingQuality,
      },
    };
  }

  it("draws only the chosen square when there is no radius or background", () => {
    const { ctx, calls } = fakeContext();
    paintFavicon(ctx, image, { crop, radius: 0 }, 32);

    expect(calls).toEqual(["drawImage"]);
    expect(ctx.drawImage).toHaveBeenCalledWith(
      image,
      10,
      20,
      100,
      100,
      0,
      0,
      32,
      32,
    );
  });

  it("fills the background inside the rounded clip, beneath the image", () => {
    const { ctx, calls } = fakeContext();
    paintFavicon(
      ctx,
      image,
      { crop, radius: 25, background: { r: 255, g: 0, b: 0, a: 1 } },
      64,
    );

    expect(calls).toEqual([
      "beginPath",
      "roundRect",
      "clip",
      "fillRect",
      "drawImage",
    ]);
    expect(ctx.roundRect).toHaveBeenCalledWith(0, 0, 64, 64, 16);
    expect(ctx.fillStyle).toBe("rgb(255 0 0)");
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 64, 64);
  });

  it("keeps a translucent background translucent", () => {
    const { ctx } = fakeContext();
    paintFavicon(
      ctx,
      image,
      { crop, radius: 0, background: { r: 0, g: 0, b: 0, a: 0.5 } },
      16,
    );

    expect(ctx.fillStyle).toBe("rgb(0 0 0 / 0.5)");
  });
});
