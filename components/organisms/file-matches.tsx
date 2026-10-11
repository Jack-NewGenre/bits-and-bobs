"use client";

import { FileUp, X } from "lucide-react";

import type { MouseEvent } from "react";

import { handOffFiles, navigatesInPlace } from "@/lib/file-handoff";
import { toolsForFiles } from "@/lib/tools";
import { IconButton } from "@/components/atoms/icon-button";
import { ToolCard } from "@/components/molecules/tool-card";

interface FileMatchesProps {
  files: File[];
  onClear: () => void;
}

/** After a file is dropped or pasted on the home page: the tools that open it. */
export function FileMatches({ files, onClear }: FileMatchesProps) {
  const tools = toolsForFiles(files);
  const label = files.length === 1 ? files[0].name : `${files.length} files`;

  // Only a click that follows a tool's link in this tab takes the files along.
  const onCardClick = (event: MouseEvent<HTMLElement>) => {
    const { target } = event;
    const onLink = target instanceof Element && target.closest("a");
    if (onLink && navigatesInPlace(event)) handOffFiles(files);
  };

  return (
    <section
      id="tool-search-results"
      aria-label="Tools for your file"
      className="mt-8"
    >
      <div className="mb-4 flex items-center gap-2">
        <FileUp className="text-muted-foreground size-4 shrink-0" aria-hidden />
        <output aria-live="polite" className="min-w-0 truncate text-sm">
          {tools.length === 0 ? (
            <>No tool opens {label}</>
          ) : (
            <>
              Open <span className="font-medium">{label}</span> with…
            </>
          )}
        </output>
        <IconButton
          icon={X}
          label="Clear file"
          shortcut="Esc"
          onClick={onClear}
          size="icon-xs"
        />
      </div>
      {tools.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Try a PNG, JPG, WebP or SVG image, or a PDF.
        </p>
      ) : (
        // Handing over on click rather than on drop means a file you change
        // your mind about never follows you into an unrelated tool.
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          onClickCapture={onCardClick}
        >
          {tools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      )}
    </section>
  );
}

export type { FileMatchesProps };
