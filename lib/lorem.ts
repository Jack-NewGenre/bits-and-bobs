/**
 * Lorem ipsum placeholder text.
 *
 * The words are the traditional corrupted Latin from Cicero's *De finibus*,
 * which is the point: it has the letter frequencies and word lengths of real
 * prose, so a layout filled with it looks like a layout filled with writing,
 * but nobody can read it, so nobody reviews the copy instead of the design.
 */

const WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing",
  "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore",
  "et", "dolore", "magna", "aliqua", "enim", "ad", "minim", "veniam",
  "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi", "aliquip",
  "ex", "ea", "commodo", "consequat", "duis", "aute", "irure", "in",
  "reprehenderit", "voluptate", "velit", "esse", "cillum", "eu", "fugiat",
  "nulla", "pariatur", "excepteur", "sint", "occaecat", "cupidatat", "non",
  "proident", "sunt", "culpa", "qui", "officia", "deserunt", "mollit",
  "anim", "id", "est", "laborum", "perspiciatis", "unde", "omnis", "iste",
  "natus", "error", "voluptatem", "accusantium", "doloremque", "laudantium",
  "totam", "rem", "aperiam", "eaque", "quae", "ab", "illo", "inventore",
  "veritatis", "quasi", "architecto", "beatae", "vitae", "dicta", "explicabo",
];

/** The opening every reader recognises as placeholder rather than content. */
export const CLASSIC_OPENER = "Lorem ipsum dolor sit amet, consectetur adipiscing elit";

export type LoremUnit = "paragraphs" | "sentences" | "words";

export interface LoremSettings {
  unit: LoremUnit;
  count: number;
  /** Begin with the familiar opening line. */
  classic: boolean;
  /** Wrap each paragraph in a `<p>` tag. */
  html: boolean;
}

export const DEFAULT_LOREM_SETTINGS: LoremSettings = {
  unit: "paragraphs",
  count: 3,
  classic: true,
  html: false,
};

export const MAX_COUNT = 50;

const SENTENCES_PER_PARAGRAPH = [3, 7] as const;
const WORDS_PER_SENTENCE = [6, 16] as const;

/** A small deterministic generator, so a given seed always reads the same. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    // xorshift32: tiny, fast, and good enough for choosing words.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 100_000) / 100_000;
  };
}

function between(random: () => number, [low, high]: readonly [number, number]) {
  return low + Math.floor(random() * (high - low + 1));
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function makeSentence(random: () => number, length?: number): string {
  const count = length ?? between(random, WORDS_PER_SENTENCE);
  const words = Array.from(
    { length: count },
    () => WORDS[Math.floor(random() * WORDS.length)],
  );

  // A comma somewhere in the middle keeps the rhythm of real prose.
  if (count > 8) {
    const comma = 2 + Math.floor(random() * (count - 4));
    words[comma] += ",";
  }

  return `${capitalise(words.join(" "))}.`;
}

export function makeParagraph(random: () => number): string {
  const count = between(random, SENTENCES_PER_PARAGRAPH);
  return Array.from({ length: count }, () => makeSentence(random)).join(" ");
}

/** Generate placeholder text. The same seed always gives the same text. */
export function generateLorem(settings: LoremSettings, seed: number): string {
  const random = createRandom(seed);
  const count = Math.max(1, Math.min(Math.round(settings.count), MAX_COUNT));

  if (settings.unit === "words") {
    const words = Array.from(
      { length: count },
      () => WORDS[Math.floor(random() * WORDS.length)],
    );
    if (settings.classic) {
      words.splice(0, 0, ...CLASSIC_OPENER.toLowerCase().replace(",", "").split(" "));
      words.length = count;
    }
    return capitalise(words.join(" "));
  }

  if (settings.unit === "sentences") {
    const sentences = Array.from({ length: count }, () => makeSentence(random));
    if (settings.classic) sentences[0] = `${CLASSIC_OPENER}.`;
    return sentences.join(" ");
  }

  const paragraphs = Array.from({ length: count }, () => makeParagraph(random));
  if (settings.classic) {
    paragraphs[0] = `${CLASSIC_OPENER}. ${paragraphs[0]}`;
  }

  return settings.html
    ? paragraphs.map((text) => `<p>${text}</p>`).join("\n")
    : paragraphs.join("\n\n");
}

export interface LoremStats {
  words: number;
  characters: number;
}

export function countLorem(text: string): LoremStats {
  const stripped = text.replace(/<[^>]+>/g, " ");
  return {
    words: stripped.split(/\s+/).filter(Boolean).length,
    characters: text.length,
  };
}
