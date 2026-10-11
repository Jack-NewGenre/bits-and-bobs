import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getAvailableTool } from "@/lib/tools";
import { ToolPageShell } from "@/components/organisms/tool-page-shell";

/**
 * Builds the page and the metadata for one tool from its catalogue entry, so
 * a route file only has to say which tool it is and what to render.
 *
 * The lookup is strict on purpose: a slug that is missing from the registry,
 * or still marked "soon", throws while the page module is evaluated and so
 * fails the build rather than shipping a broken route.
 */
export function createToolPage(slug: string, tool: ReactNode) {
  const entry = getAvailableTool(slug);

  const metadata: Metadata = {
    // The root layout's title template appends the site name.
    title: entry.name,
    description: entry.description,
    alternates: { canonical: entry.href },
  };

  function Page() {
    // A full-screen tool brings its own chrome; the heading stays for screen
    // readers and the document outline.
    if (entry.fullScreen) {
      return (
        <>
          <h1 className="sr-only">{entry.name}</h1>
          {tool}
        </>
      );
    }
    return (
      <ToolPageShell
        icon={entry.icon}
        title={entry.name}
        description={entry.blurb}
      >
        {tool}
      </ToolPageShell>
    );
  }

  return { metadata, Page };
}
