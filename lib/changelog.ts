/**
 * The changelog is written and read in one place: `CHANGELOG.md` at the repo
 * root. This parses that file so the page and the markdown can never drift.
 * There is nothing to keep in sync because there is only one copy.
 */

export const CHANGE_KINDS = ["Added", "Changed", "Fixed", "Removed"] as const;

export type ChangeKind = (typeof CHANGE_KINDS)[number];

export interface ChangeGroup {
  kind: ChangeKind;
  items: string[];
}

export interface Release {
  version: string;
  /** ISO date, as written in the heading. */
  date: string;
  /** Free text between the version heading and the first group, if any. */
  summary?: string;
  groups: ChangeGroup[];
}

/** `## 1.2.0 - 2026-09-13`. The `v` prefix is optional. */
const RELEASE_HEADING = /^##\s+v?(\S+)\s+-\s+(\d{4}-\d{2}-\d{2})\s*$/;
const GROUP_HEADING = /^###\s+(.+?)\s*$/;
const BULLET = /^[-*]\s+(.+?)\s*$/;

function isChangeKind(value: string): value is ChangeKind {
  return (CHANGE_KINDS as readonly string[]).includes(value);
}

/**
 * Reads the releases out of a changelog document, newest first, in the order
 * they are written in, which the skill keeps correct.
 *
 * Anything it does not recognise is skipped rather than throwing, so a stray
 * note in the file cannot take the page down.
 */
export function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = [];
  let release: Release | undefined;
  let group: ChangeGroup | undefined;
  const summary: string[] = [];

  const flushSummary = () => {
    if (release && !release.summary && summary.length > 0) {
      release.summary = summary.join(" ");
    }
    summary.length = 0;
  };

  for (const line of markdown.split("\n")) {
    const trimmed = line.trim();

    const heading = RELEASE_HEADING.exec(trimmed);
    if (heading) {
      flushSummary();
      release = { version: heading[1], date: heading[2], groups: [] };
      group = undefined;
      releases.push(release);
      continue;
    }

    if (!release) continue;

    const groupHeading = GROUP_HEADING.exec(trimmed);
    if (groupHeading) {
      flushSummary();
      const kind = groupHeading[1];
      group = isChangeKind(kind) ? { kind, items: [] } : undefined;
      if (group) release.groups.push(group);
      continue;
    }

    const bullet = BULLET.exec(trimmed);
    if (bullet && group) {
      group.items.push(bullet[1]);
      continue;
    }

    if (trimmed && !group && !trimmed.startsWith("#")) {
      summary.push(trimmed);
    }
  }

  flushSummary();

  return releases.filter((entry) => entry.groups.length > 0 || entry.summary);
}

/** Total number of individual changes in a release, for the entry's count badge. */
export function countChanges(release: Release): number {
  return release.groups.reduce((total, group) => total + group.items.length, 0);
}

/**
 * Splits `**Name**: what it does.` into its two halves so the name can be
 * emphasised without shipping a markdown renderer for one bold span.
 */
export function splitChangeItem(item: string): {
  label?: string;
  text: string;
} {
  const match = /^\*\*(.+?)\*\*\s*:?\s*(.*)$/.exec(item);

  if (!match) return { text: item };

  return { label: match[1], text: match[2] };
}
