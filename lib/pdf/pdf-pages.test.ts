import { describe, expect, it } from "vitest";

import {
  allPages,
  formatPageRanges,
  invertSelection,
  parsePageRanges,
} from "@/lib/pdf/pdf-pages";

const parse = (input: string, total = 10) => parsePageRanges(input, total).pages;

describe("parsePageRanges", () => {
  it("reads single pages and ranges", () => {
    expect(parse("1")).toEqual([1]);
    expect(parse("2-4")).toEqual([2, 3, 4]);
    expect(parse("1,3,5")).toEqual([1, 3, 5]);
    expect(parse("1-3, 7, 9-10")).toEqual([1, 2, 3, 7, 9, 10]);
  });

  it("ignores spacing wherever it falls", () => {
    expect(parse("  1 - 3 ,   7  ")).toEqual([1, 2, 3, 7]);
  });

  it("reads an open range as running to the end, or from the start", () => {
    expect(parse("8-")).toEqual([8, 9, 10]);
    expect(parse("-3")).toEqual([1, 2, 3]);
  });

  it("reads a backwards range the way it was obviously meant", () => {
    expect(parse("5-2")).toEqual([2, 3, 4, 5]);
  });

  it("sorts and de-duplicates overlapping parts", () => {
    expect(parse("5,1,3,1,4-5")).toEqual([1, 3, 4, 5]);
  });

  it("clamps a range that runs past the end", () => {
    expect(parse("8-99")).toEqual([8, 9, 10]);
  });

  it("drops pages the document does not have, and says which", () => {
    const result = parsePageRanges("2, 99, banana", 10);
    expect(result.pages).toEqual([2]);
    expect(result.ignored).toEqual(["99", "banana"]);
  });

  it("returns nothing for an empty selection", () => {
    expect(parsePageRanges("", 10)).toEqual({ pages: [], ignored: [] });
    expect(parsePageRanges("   ,  ", 10).pages).toEqual([]);
  });

  it("ignores a bare dash, which selects nothing in particular", () => {
    expect(parsePageRanges("-", 10)).toEqual({ pages: [], ignored: ["-"] });
  });

  it("returns nothing for an empty document", () => {
    expect(parsePageRanges("1-5", 0).pages).toEqual([]);
  });
});

describe("formatPageRanges", () => {
  it("collapses runs into ranges", () => {
    expect(formatPageRanges([1, 2, 3, 5])).toBe("1-3, 5");
    expect(formatPageRanges([1, 2, 3, 4, 5])).toBe("1-5");
  });

  it("writes a pair as two numbers, which is shorter than a range", () => {
    expect(formatPageRanges([4, 5])).toBe("4, 5");
  });

  it("handles scattered pages", () => {
    expect(formatPageRanges([1, 3, 5, 7])).toBe("1, 3, 5, 7");
  });

  it("sorts and de-duplicates first", () => {
    expect(formatPageRanges([3, 1, 2, 3])).toBe("1-3");
  });

  it("is empty for no pages", () => {
    expect(formatPageRanges([])).toBe("");
  });

  it("round-trips through the parser", () => {
    for (const pages of [[1], [1, 2, 3, 7, 9, 10], [2, 4, 6]]) {
      expect(parse(formatPageRanges(pages))).toEqual(pages);
    }
  });
});

describe("allPages", () => {
  it("counts from one", () => {
    expect(allPages(3)).toEqual([1, 2, 3]);
  });

  it("is empty for an empty document", () => {
    expect(allPages(0)).toEqual([]);
    expect(allPages(-2)).toEqual([]);
  });
});

describe("invertSelection", () => {
  it("returns everything that was not chosen", () => {
    expect(invertSelection([2, 4], 5)).toEqual([1, 3, 5]);
  });

  it("is empty when everything was chosen", () => {
    expect(invertSelection([1, 2, 3], 3)).toEqual([]);
  });

  it("is everything when nothing was chosen", () => {
    expect(invertSelection([], 3)).toEqual([1, 2, 3]);
  });
});
