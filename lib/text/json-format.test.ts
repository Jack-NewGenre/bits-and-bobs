import { describe, expect, it } from "vitest";

import {
  DEFAULT_JSON_OPTIONS,
  locate,
  findLossyNumbers,
  lineColumnFromMessage,
  offsetFromMessage,
  processJson,
  sortKeys,
  summarise,
  trimPosition,
} from "@/lib/text/json-format";

const run = (text: string, options = {}) =>
  processJson(text, { ...DEFAULT_JSON_OPTIONS, ...options });

describe("locate", () => {
  it("turns a character offset into a line and column", () => {
    const text = "one\ntwo\nthree";
    expect(locate(text, 0)).toMatchObject({ line: 1, column: 1 });
    expect(locate(text, 4)).toMatchObject({ line: 2, column: 1, excerpt: "two" });
    expect(locate(text, 6)).toMatchObject({ line: 2, column: 3 });
  });

  it("clamps an offset past the end", () => {
    expect(locate("abc", 999)).toMatchObject({ line: 1, column: 4 });
  });
});

describe("offsetFromMessage", () => {
  it("reads the offset out of a parser message", () => {
    expect(offsetFromMessage("Unexpected token } at position 42")).toBe(42);
  });

  it("returns undefined when there is none to find", () => {
    expect(offsetFromMessage("Unexpected end of JSON input")).toBeUndefined();
  });
});

describe("lineColumnFromMessage", () => {
  it("reads a line and column when that is all the engine gives", () => {
    expect(
      lineColumnFromMessage("Unexpected token (line 3 column 5)"),
    ).toEqual({ line: 3, column: 5 });
  });

  it("returns undefined when there is none", () => {
    expect(lineColumnFromMessage("Unexpected end of input")).toBeUndefined();
  });
});

describe("trimPosition", () => {
  it("drops the position wording the UI already renders", () => {
    expect(
      trimPosition("Expected property name in JSON at position 14 (line 3 column 3)"),
    ).toBe("Expected property name in JSON");
    expect(trimPosition("Unexpected token } at position 7")).toBe(
      "Unexpected token }",
    );
  });

  it("leaves a message with no position wording untouched", () => {
    expect(trimPosition("Unexpected end of JSON input")).toBe(
      "Unexpected end of JSON input",
    );
  });
});

describe("processJson", () => {
  it("formats with the chosen indent", () => {
    expect(run('{"a":1}').value).toBe('{\n  "a": 1\n}');
    expect(run('{"a":1}', { indent: 4 }).value).toBe('{\n    "a": 1\n}');
    expect(run('{"a":1}', { indent: "tab" }).value).toBe('{\n\t"a": 1\n}');
  });

  it("minifies", () => {
    expect(run('{\n  "a": 1\n}', { mode: "minify" }).value).toBe('{"a":1}');
  });

  it("treats an empty document as valid and empty", () => {
    expect(run("   ")).toEqual({ ok: true, value: "" });
  });

  it("reports where the error is, not just that there is one", () => {
    const result = run('{\n  "a": 1,\n  oops\n}');
    expect(result.ok).toBe(false);
    expect(result.error?.line).toBeGreaterThan(1);
    expect(result.error?.excerpt).toContain("oops");
    // The position is rendered separately, so it is not repeated in the text.
    expect(result.error?.message).not.toMatch(/position|line \d/i);
  });

  it("summarises the shape of what it parsed", () => {
    const result = run('{"a":{"b":[1,2,3]},"c":true}');
    expect(result.stats).toEqual({ keys: 3, depth: 3, items: 3 });
  });
});

describe("summarise", () => {
  it("counts nothing for a bare value", () => {
    expect(summarise(42)).toEqual({ keys: 0, depth: 0, items: 0 });
  });

  it("measures how deeply things nest", () => {
    expect(summarise({ a: { b: { c: 1 } } }).depth).toBe(3);
    expect(summarise([[[1]]]).depth).toBe(3);
  });
});

describe("sortKeys", () => {
  it("alphabetises object keys at every level", () => {
    expect(JSON.stringify(sortKeys({ b: 1, a: { d: 2, c: 3 } }))).toBe(
      '{"a":{"c":3,"d":2},"b":1}',
    );
  });

  it("leaves array order alone, because order is the data", () => {
    expect(sortKeys([3, 1, 2])).toEqual([3, 1, 2]);
  });

  it("sorts objects inside arrays", () => {
    expect(JSON.stringify(sortKeys([{ b: 1, a: 2 }]))).toBe('[{"a":2,"b":1}]');
  });

  it("passes primitives and null straight through", () => {
    expect(sortKeys(null)).toBeNull();
    expect(sortKeys("x")).toBe("x");
  });
});

describe("findLossyNumbers", () => {
  it("catches an integer beyond what float64 holds exactly", () => {
    expect(findLossyNumbers('{"id": 12345678901234567890}')).toEqual([
      "12345678901234567890",
    ]);
    // One past the safe integer limit.
    expect(findLossyNumbers('{"id": 9007199254740993}')).toEqual([
      "9007199254740993",
    ]);
  });

  it("catches a number that overflows to Infinity", () => {
    expect(findLossyNumbers('{"n": 1e400}')).toEqual(["1e400"]);
  });

  it("leaves ordinary numbers alone", () => {
    expect(
      findLossyNumbers('{"a": 42, "b": -7, "c": 1.5, "d": 1e3, "e": 0}'),
    ).toEqual([]);
  });

  it("stops at the safe integer boundary, not before it", () => {
    expect(findLossyNumbers('{"n": 9007199254740991}')).toEqual([]);
  });

  it("ignores digits inside strings, which are not numbers", () => {
    expect(findLossyNumbers('{"id": "12345678901234567890"}')).toEqual([]);
  });

  it("ignores a big number written inside an escaped string", () => {
    expect(findLossyNumbers('{"s": "quote \\" 12345678901234567890"}')).toEqual(
      [],
    );
  });

  it("reports each distinct literal once", () => {
    expect(
      findLossyNumbers('[12345678901234567890, 12345678901234567890]'),
    ).toEqual(["12345678901234567890"]);
  });
});

describe("processJson lossy numbers", () => {
  it("flags a document whose numbers cannot survive the round trip", () => {
    const result = processJson('{"id": 12345678901234567890}', DEFAULT_JSON_OPTIONS);
    expect(result.ok).toBe(true);
    expect(result.lossyNumbers).toEqual(["12345678901234567890"]);
    // The output really has changed, which is why it is worth saying.
    expect(result.value).not.toContain("12345678901234567890");
  });

  it("says nothing for a document that round-trips cleanly", () => {
    expect(
      processJson('{"a": 1}', DEFAULT_JSON_OPTIONS).lossyNumbers,
    ).toBeUndefined();
  });
});
