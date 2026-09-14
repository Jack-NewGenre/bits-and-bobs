import { describe, expect, it } from "vitest";

import {
  CLASSIC_OPENER,
  countLorem,
  createRandom,
  DEFAULT_LOREM_SETTINGS,
  generateLorem,
  makeSentence,
  MAX_COUNT,
} from "@/lib/generators/lorem";

const make = (overrides = {}, seed = 42) =>
  generateLorem({ ...DEFAULT_LOREM_SETTINGS, ...overrides }, seed);

describe("createRandom", () => {
  it("gives the same sequence for the same seed", () => {
    const first = Array.from({ length: 5 }, createRandom(7));
    expect(Array.from({ length: 5 }, createRandom(7))).toEqual(first);
  });

  it("gives a different sequence for a different seed", () => {
    expect(createRandom(1)()).not.toBe(createRandom(2)());
  });

  it("stays within 0 and 1", () => {
    const random = createRandom(99);
    for (let i = 0; i < 200; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("survives a seed of zero", () => {
    expect(Number.isFinite(createRandom(0)())).toBe(true);
  });
});

describe("makeSentence", () => {
  it("starts with a capital and ends with a full stop", () => {
    const sentence = makeSentence(createRandom(3));
    expect(sentence[0]).toBe(sentence[0].toUpperCase());
    expect(sentence.endsWith(".")).toBe(true);
  });

  it("takes an explicit length", () => {
    const sentence = makeSentence(createRandom(3), 5);
    expect(sentence.replace(/[.,]/g, "").split(" ")).toHaveLength(5);
  });
});

describe("generateLorem", () => {
  it("is deterministic for a given seed", () => {
    expect(make()).toBe(make());
    expect(make({}, 1)).not.toBe(make({}, 2));
  });

  it("opens with the familiar line when asked", () => {
    expect(make({ classic: true }).startsWith(CLASSIC_OPENER)).toBe(true);
    expect(make({ classic: false }).startsWith(CLASSIC_OPENER)).toBe(false);
  });

  it("produces the requested number of paragraphs", () => {
    expect(make({ unit: "paragraphs", count: 4 }).split("\n\n")).toHaveLength(4);
  });

  it("produces the requested number of sentences", () => {
    const text = make({ unit: "sentences", count: 5 });
    expect(text.match(/\.(\s|$)/g)).toHaveLength(5);
  });

  it("produces exactly the requested number of words", () => {
    for (const count of [1, 7, 25]) {
      const text = make({ unit: "words", count });
      expect(text.split(/\s+/).filter(Boolean)).toHaveLength(count);
    }
  });

  it("keeps the word count exact even with the classic opener", () => {
    // The opener is nine words, so a request for three must still give three.
    expect(
      make({ unit: "words", count: 3, classic: true }).split(/\s+/),
    ).toHaveLength(3);
  });

  it("wraps paragraphs in tags for HTML", () => {
    const text = make({ unit: "paragraphs", count: 2, html: true });
    expect(text.match(/<p>/g)).toHaveLength(2);
    expect(text.match(/<\/p>/g)).toHaveLength(2);
  });

  it("leaves sentences and words unwrapped, which have no paragraph to tag", () => {
    expect(make({ unit: "words", count: 5, html: true })).not.toContain("<p>");
  });

  it("clamps the count into a sane range", () => {
    expect(make({ unit: "paragraphs", count: 0 }).split("\n\n")).toHaveLength(1);
    expect(
      make({ unit: "paragraphs", count: 9999 }).split("\n\n"),
    ).toHaveLength(MAX_COUNT);
  });
});

describe("countLorem", () => {
  it("counts words and characters", () => {
    expect(countLorem("one two three")).toEqual({ words: 3, characters: 13 });
  });

  it("does not count tags as words", () => {
    expect(countLorem("<p>one two</p>").words).toBe(2);
  });

  it("handles an empty string", () => {
    expect(countLorem("")).toEqual({ words: 0, characters: 0 });
  });
});
