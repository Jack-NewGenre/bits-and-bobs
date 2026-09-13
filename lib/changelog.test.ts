import { describe, expect, it } from "vitest";

import {
  countChanges,
  parseChangelog,
  splitChangeItem,
} from "@/lib/changelog";

const DOC = `# Changelog

All notable changes to this project. Newest first.

## 1.1.0 - 2026-09-20

A short summary line.

### Added
- **Split PDF**: pull pages out of a PDF.
- **Merge PDF**: join several PDFs into one.

### Fixed
- Contrast ratio rounded the wrong way.

## 1.0.0 - 2026-09-13

### Added
- **UUID Generator**: generate v4 UUIDs.
`;

describe("parseChangelog", () => {
  it("reads releases in the order they are written", () => {
    expect(parseChangelog(DOC).map((entry) => entry.version)).toEqual([
      "1.1.0",
      "1.0.0",
    ]);
  });

  it("reads the date from the heading", () => {
    expect(parseChangelog(DOC)[0].date).toBe("2026-09-20");
  });

  it("accepts a v prefix on the version", () => {
    const [release] = parseChangelog("## v2.0.0 - 2026-01-01\n\n### Added\n- A thing.");
    expect(release).toMatchObject({ version: "2.0.0", date: "2026-01-01" });
  });

  it("keeps the text between the heading and the first group as a summary", () => {
    expect(parseChangelog(DOC)[0].summary).toBe("A short summary line.");
    expect(parseChangelog(DOC)[1].summary).toBeUndefined();
  });

  it("groups bullets under their kind", () => {
    expect(parseChangelog(DOC)[0].groups).toEqual([
      {
        kind: "Added",
        items: [
          "**Split PDF**: pull pages out of a PDF.",
          "**Merge PDF**: join several PDFs into one.",
        ],
      },
      { kind: "Fixed", items: ["Contrast ratio rounded the wrong way."] },
    ]);
  });

  it("skips a group heading it does not recognise, and its bullets", () => {
    const [release] = parseChangelog(
      "## 1.0.0 - 2026-01-01\n\n### Nonsense\n- Ignored.\n\n### Added\n- Kept.",
    );
    expect(release.groups).toEqual([{ kind: "Added", items: ["Kept."] }]);
  });

  it("ignores content before the first release heading", () => {
    expect(parseChangelog("# Changelog\n\nIntro text.")).toEqual([]);
  });

  it("returns nothing for an empty document", () => {
    expect(parseChangelog("")).toEqual([]);
  });
});

describe("countChanges", () => {
  it("totals the bullets across every group", () => {
    expect(countChanges(parseChangelog(DOC)[0])).toBe(3);
  });
});

describe("splitChangeItem", () => {
  it("splits a bolded label from its description", () => {
    expect(splitChangeItem("**Split PDF**: pull pages out.")).toEqual({
      label: "Split PDF",
      text: "pull pages out.",
    });
  });

  it("leaves a plain line alone", () => {
    expect(splitChangeItem("Rounded the ratio correctly.")).toEqual({
      text: "Rounded the ratio correctly.",
    });
  });
});
