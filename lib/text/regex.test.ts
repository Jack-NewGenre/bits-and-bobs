import { describe, expect, it } from "vitest";

import {
  compile,
  MAX_MATCHES,
  replaceAll,
  runRegex,
  toSegments,
} from "@/lib/text/regex";

describe("compile", () => {
  it("builds a valid pattern", () => {
    expect(compile("\\d+", "g").regex).toBeInstanceOf(RegExp);
  });

  it("reports a bad pattern rather than throwing", () => {
    const { regex, error } = compile("(unclosed", "");
    expect(regex).toBeUndefined();
    expect(error).toBeTruthy();
  });
});

describe("runRegex", () => {
  it("returns nothing for an empty pattern", () => {
    expect(runRegex("", "g", "abc")).toEqual({
      ok: true,
      matches: [],
      truncated: false,
    });
  });

  it("finds only the first match without the global flag", () => {
    const result = runRegex("\\d", "", "a1b2");
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({ text: "1", index: 1 });
  });

  it("finds every match with it", () => {
    expect(runRegex("\\d", "g", "a1b2").matches.map((m) => m.text)).toEqual([
      "1",
      "2",
    ]);
  });

  it("reports numbered captures", () => {
    const [match] = runRegex("(\\w)(\\d)", "g", "a1").matches;
    expect(match.groups).toEqual([
      { name: "1", value: "a" },
      { name: "2", value: "1" },
    ]);
  });

  it("prefers named captures when the pattern has them", () => {
    const [match] = runRegex("(?<letter>\\w)(?<digit>\\d)", "g", "a1").matches;
    expect(match.groups).toEqual([
      { name: "letter", value: "a" },
      { name: "digit", value: "1" },
    ]);
  });

  it("terminates on a pattern that can match nothing", () => {
    // Without advancing the cursor by hand this would never finish.
    const result = runRegex("a*", "g", "bbb");
    expect(result.ok).toBe(true);
    expect(result.matches.length).toBeLessThanOrEqual(MAX_MATCHES);
  });

  it("stops at the cap and says so", () => {
    const result = runRegex("a", "g", "a".repeat(MAX_MATCHES + 50));
    expect(result.matches).toHaveLength(MAX_MATCHES);
    expect(result.truncated).toBe(true);
  });

  it("reports an invalid pattern instead of crashing", () => {
    const result = runRegex("(", "g", "abc");
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe("toSegments", () => {
  it("splits the input into plain and matched runs", () => {
    const matches = runRegex("\\d+", "g", "a12b3").matches;
    expect(toSegments("a12b3", matches)).toEqual([
      { text: "a", isMatch: false },
      { text: "12", isMatch: true },
      { text: "b", isMatch: false },
      { text: "3", isMatch: true },
    ]);
  });

  it("handles a match at the very start and end", () => {
    const matches = runRegex("\\d", "g", "1a2").matches;
    expect(toSegments("1a2", matches)).toEqual([
      { text: "1", isMatch: true },
      { text: "a", isMatch: false },
      { text: "2", isMatch: true },
    ]);
  });

  it("returns the whole input untouched when nothing matched", () => {
    expect(toSegments("abc", [])).toEqual([{ text: "abc", isMatch: false }]);
  });

  it("skips empty matches, which have nothing to highlight", () => {
    const matches = runRegex("a*", "g", "bb").matches;
    expect(toSegments("bb", matches)).toEqual([{ text: "bb", isMatch: false }]);
  });
});

describe("replaceAll", () => {
  it("applies captures from the template", () => {
    expect(replaceAll("(\\w+)@(\\w+)", "g", "me@here", "$2/$1")).toEqual({
      ok: true,
      value: "here/me",
    });
  });

  it("replaces every occurrence when global", () => {
    expect(replaceAll("a", "g", "aaa", "b").value).toBe("bbb");
  });

  it("reports a bad pattern", () => {
    expect(replaceAll("(", "g", "abc", "x").ok).toBe(false);
  });
});
