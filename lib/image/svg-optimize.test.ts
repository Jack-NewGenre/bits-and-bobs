import { describe, expect, it } from "vitest";

import { countSvgPaths } from "@/lib/image/vectorize";
import { optimizeSvg, toHexColor } from "@/lib/image/svg-optimize";

const wrap = (body: string) =>
  `<svg width="10" height="10" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

const path = (fill: string, d: string, opacity = "1") =>
  `<path fill="${fill}" stroke="${fill}" stroke-width="1" opacity="${opacity}" d="${d}" />`;

describe("toHexColor", () => {
  it("shortens rgb() to hex", () => {
    expect(toHexColor("rgb(255,0,0)")).toBe("#f00");
    expect(toHexColor("rgb(17,34,51)")).toBe("#123");
    expect(toHexColor("rgb(12,34,56)")).toBe("#0c2238");
  });

  it("leaves anything that isn't rgb() alone", () => {
    expect(toHexColor("#abcdef")).toBe("#abcdef");
    expect(toHexColor("none")).toBe("none");
    expect(toHexColor("rgb(300,0,0)")).toBe("rgb(300,0,0)");
  });
});

describe("optimizeSvg", () => {
  it("merges consecutive paths that share a style", () => {
    const svg = wrap(
      path("rgb(255,0,0)", "M 0 0 L 1 1 Z") + path("rgb(255,0,0)", "M 2 2 L 3 3 Z"),
    );
    const out = optimizeSvg(svg);

    expect(countSvgPaths(out)).toBe(1);
    expect(out).toContain('d="M 0 0 L 1 1 Z M 2 2 L 3 3 Z"');
    expect(out).toContain('fill="#f00"');
  });

  it("keeps differently-styled paths separate and in order", () => {
    const svg = wrap(
      path("rgb(255,0,0)", "M 0 0 Z") +
        path("rgb(0,0,255)", "M 1 1 Z") +
        path("rgb(255,0,0)", "M 2 2 Z"),
    );
    const out = optimizeSvg(svg);

    expect(countSvgPaths(out)).toBe(3);
    expect(out.indexOf("#00f")).toBeLessThan(out.lastIndexOf("#f00"));
  });

  it("drops the default opacity but keeps a real one", () => {
    const opaque = optimizeSvg(wrap(path("rgb(0,0,0)", "M 0 0 Z", "1")));
    expect(opaque).not.toContain("opacity");

    const faded = optimizeSvg(wrap(path("rgb(0,0,0)", "M 0 0 Z", "0.5")));
    expect(faded).toContain('opacity="0.5"');
  });

  it("removes fully transparent paths", () => {
    const svg = wrap(
      path("rgb(0,0,0)", "M 0 0 Z", "0") + path("rgb(0,0,0)", "M 1 1 Z", "1"),
    );
    const out = optimizeSvg(svg);

    expect(countSvgPaths(out)).toBe(1);
    expect(out).toContain('d="M 1 1 Z"');
  });

  it("preserves the surrounding svg element", () => {
    const out = optimizeSvg(wrap(path("rgb(0,0,0)", "M 0 0 Z")));
    expect(out.startsWith('<svg width="10" height="10"')).toBe(true);
    expect(out.endsWith("</svg>")).toBe(true);
  });

  it("leaves markup without paths untouched", () => {
    const svg = wrap('<rect width="10" height="10" />');
    expect(optimizeSvg(svg)).toBe(svg);
  });

  it("shrinks a realistic multi-region trace", () => {
    const body = Array.from({ length: 40 }, (_, index) =>
      path("rgb(12,34,56)", `M ${index} ${index} L ${index + 1} ${index} Z`),
    ).join("");
    const svg = wrap(body);
    const out = optimizeSvg(svg);

    expect(countSvgPaths(out)).toBe(1);
    expect(out.length).toBeLessThan(svg.length / 2);
  });
});
