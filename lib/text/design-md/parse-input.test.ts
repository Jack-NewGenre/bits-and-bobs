import { describe, expect, it } from "vitest";

import { readDesignInput } from "@/lib/text/design-md/parse-input";
import { emptyCapture } from "@/lib/text/design-md/types";

describe("readDesignInput", () => {
  it("treats blank text as empty", () => {
    expect(readDesignInput("   ").kind).toBe("empty");
  });

  it("reads a bookmarklet capture back", () => {
    const capture = {
      ...emptyCapture(),
      title: "Acme",
      variables: { brand: "#635bff" },
    };
    const input = readDesignInput(JSON.stringify(capture));
    expect(input.kind).toBe("capture");
    expect(input.capture.title).toBe("Acme");
    expect(input.capture.variables).toEqual({ brand: "#635bff" });
  });

  it("drops anything in a capture with the wrong shape", () => {
    const input = readDesignInput(
      JSON.stringify({
        kind: "design-md-capture",
        version: 1,
        variables: { a: 3 },
        counts: { colours: { "#fff": "x" } },
        components: { evil: { a: "b" }, h1: { color: 5 } },
      }),
    );
    expect(input.kind).toBe("capture");
    expect(input.capture.variables).toEqual({});
    expect(input.capture.counts.colours).toEqual({});
    expect(input.capture.components).toEqual({ h1: {} });
  });

  it("reads style blocks and inline styles from HTML and counts linked sheets", () => {
    const input = readDesignInput(
      `<html><head><title>Hi</title><link rel="stylesheet" href="a.css">
      <link rel="alternate stylesheet" href="contrast.css"><style>h1 { color: #123456 }</style></head>
      <body><h1 style="font-size: 30px">x</h1></body></html>`,
    );
    expect(input.kind).toBe("html");
    expect(input.linkedStylesheets).toBe(1);
    expect(input.capture.title).toBe("Hi");
    expect(input.capture.counts.colours).toEqual({ "#123456": 1 });
    expect(input.capture.counts.fontSizes).toEqual({ "30px": 1 });
  });

  it("falls back to CSS for anything else", () => {
    const input = readDesignInput("h1 { color: red }");
    expect(input.kind).toBe("css");
    expect(input.capture.components.h1).toEqual({ color: "red" });
  });
});
