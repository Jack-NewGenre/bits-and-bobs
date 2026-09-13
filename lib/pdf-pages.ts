/**
 * Page selections, written the way people write them.
 *
 * "1-3, 7, 12-" is how anyone would describe a set of pages out loud, and it
 * is what a print dialog accepts, so it is what these tools accept too. The
 * parsing is deliberately forgiving (spaces anywhere, ranges backwards,
 * duplicates, numbers past the end) because the alternative is refusing a
 * selection whose meaning is perfectly obvious.
 */

/** Pages are 1-based everywhere the user can see them. */
export interface PageSelection {
  /** Sorted, de-duplicated, 1-based page numbers. */
  pages: number[];
  /** Parts of the input that meant nothing, for gentle feedback. */
  ignored: string[];
}

/**
 * Parse a page selection against a document of `total` pages. An empty or
 * fully unusable selection returns no pages rather than an error.
 */
export function parsePageRanges(input: string, total: number): PageSelection {
  const pages = new Set<number>();
  const ignored: string[] = [];

  if (total < 1) return { pages: [], ignored: [] };

  for (const rawPart of input.split(",")) {
    const part = rawPart.trim();
    if (part === "") continue;

    // "5-" means from five to the end; "-5" means from the start to five.
    const range = /^(\d*)\s*-\s*(\d*)$/.exec(part);
    if (range) {
      const [, rawFrom, rawTo] = range;
      if (rawFrom === "" && rawTo === "") {
        ignored.push(part);
        continue;
      }
      const from = rawFrom === "" ? 1 : Number(rawFrom);
      const to = rawTo === "" ? total : Number(rawTo);
      // A backwards range is a typo with an obvious meaning, so read it.
      const low = Math.max(1, Math.min(from, to));
      const high = Math.min(total, Math.max(from, to));
      if (high < 1 || low > total) {
        ignored.push(part);
        continue;
      }
      for (let page = low; page <= high; page++) pages.add(page);
      continue;
    }

    const single = /^\d+$/.exec(part);
    if (single) {
      const page = Number(part);
      if (page >= 1 && page <= total) pages.add(page);
      else ignored.push(part);
      continue;
    }

    ignored.push(part);
  }

  return { pages: [...pages].sort((a, b) => a - b), ignored };
}

/** Render a list of pages back as a compact range string. */
export function formatPageRanges(pages: number[]): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  if (sorted.length === 0) return "";

  const parts: string[] = [];
  let start = sorted[0];
  let previous = sorted[0];

  const flush = () => {
    if (start === previous) parts.push(String(start));
    else if (previous === start + 1) parts.push(`${start}, ${previous}`);
    else parts.push(`${start}-${previous}`);
  };

  for (const page of sorted.slice(1)) {
    if (page === previous + 1) {
      previous = page;
      continue;
    }
    flush();
    start = page;
    previous = page;
  }
  flush();

  return parts.join(", ");
}

/** Every page of a document, for the "all pages" default. */
export function allPages(total: number): number[] {
  return Array.from({ length: Math.max(0, total) }, (_, index) => index + 1);
}

/** The pages a selection leaves out: what "remove these" would keep. */
export function invertSelection(pages: number[], total: number): number[] {
  const chosen = new Set(pages);
  return allPages(total).filter((page) => !chosen.has(page));
}
