import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { ScrollText } from "lucide-react";

import { parseChangelog } from "@/lib/changelog";
import { ToolPageShell } from "@/components/tool-page-shell";
import { ReleaseEntry } from "@/components/changelog/release-entry";

const TITLE = "Changelog";
const DESCRIPTION = "What's new in Toolbox. Every release, newest first.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/changelog" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/changelog" },
};

/**
 * `CHANGELOG.md` is the single source of truth, read at build time so the page
 * is static and the file stays the only place a release is written down.
 */
async function getReleases() {
  const file = await readFile(
    path.join(process.cwd(), "CHANGELOG.md"),
    "utf8",
  );

  return parseChangelog(file);
}

export default async function ChangelogPage() {
  const releases = await getReleases();

  return (
    <ToolPageShell icon={ScrollText} title={TITLE} description={DESCRIPTION}>
      {releases.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No releases have been recorded yet.
        </p>
      ) : (
        <div>
          {releases.map((release) => (
            <ReleaseEntry key={release.version} release={release} />
          ))}
        </div>
      )}
    </ToolPageShell>
  );
}
