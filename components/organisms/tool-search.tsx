"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Dices, FileUp, X } from "lucide-react";
import { toast } from "sonner";

import { clearHandedOffFiles, handOffFiles } from "@/lib/file-handoff";
import { readClipboard } from "@/lib/read-clipboard";
import { SEARCH_PROMPTS } from "@/lib/search-prompts";
import { randomTool, searchTools, toolsForFiles } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { useModifierKey } from "@/hooks/use-modifier-key";
import { useTypewriter } from "@/hooks/use-typewriter";
import { useWindowFileDrop } from "@/hooks/use-window-file-drop";
import { IconButton } from "@/components/atoms/icon-button";
import { ToolCard } from "@/components/molecules/tool-card";
import { FileMatches } from "@/components/organisms/file-matches";

interface ToolSearchProps {
  /** Shown while the field is empty: the featured tools and the full catalogue. */
  children: ReactNode;
}

const PROMPT_LABELS = SEARCH_PROMPTS.map((prompt) => prompt.label);

/** Only focus on load with a mouse: on a phone it would throw up the keyboard. */
const hasFinePointer = () => window.matchMedia?.("(pointer: fine)").matches ?? false;

/**
 * The home page search, read as a sentence: "I want to…". Filters the catalogue
 * as you type, and finds the tools that open a file dropped, pasted or chosen.
 */
export function ToolSearch({ children }: ToolSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const modifier = useModifierKey();

  useEffect(() => {
    if (hasFinePointer()) inputRef.current?.focus();
  }, []);

  const takeFiles = useCallback((next: File[]) => {
    setFiles(next);
    setQuery("");
  }, []);
  const dragging = useWindowFileDrop(takeFiles);

  const results = searchTools(query);
  const searching = query.trim().length > 0;
  const hasFiles = files.length > 0;
  const example = useTypewriter(PROMPT_LABELS, searching || hasFiles);

  const search = (next: string) => {
    clearHandedOffFiles();
    setFiles([]);
    setQuery(next);
  };

  const clear = () => {
    search("");
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") clear();
    if (event.key !== "Enter") return;
    if (hasFiles) {
      const [first] = toolsForFiles(files);
      if (!first) return;
      handOffFiles(files);
      router.push(first.href);
    } else if (results[0]) {
      router.push(results[0].href);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = Array.from(event.clipboardData.files);
    if (pasted.length === 0) return;
    event.preventDefault();
    takeFiles(pasted);
  };

  const pasteFromClipboard = async () => {
    try {
      const { files: pasted, text } = await readClipboard();
      if (pasted.length > 0) takeFiles(pasted);
      else if (text.trim()) search(text.trim());
      else toast("There is nothing on the clipboard to paste.");
    } catch {
      toast.error(`The browser blocked the clipboard. Press ${modifier}V in the search instead.`);
    }
  };

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-semibold tracking-tight sm:text-3xl">
        <label htmlFor="tool-search-input" className="text-muted-foreground shrink-0">
          I want to
        </label>
        <div
          className={cn(
            "focus-within:border-foreground flex min-w-[min(100%,18rem)] flex-1 items-center gap-1 border-b-2 border-dashed transition-colors",
            dragging && "border-primary border-solid"
          )}
        >
          <input
            id="tool-search-input"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => search(event.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={dragging ? "find a tool for this file" : `${example}▍`}
            aria-label="Search tools"
            aria-controls="tool-search-results"
            autoComplete="off"
            className="placeholder:text-muted-foreground/50 h-12 min-w-0 flex-1 bg-transparent outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <div className="flex shrink-0 items-center gap-0.5 text-base font-normal">
            {(searching || hasFiles) && (
              <IconButton icon={X} label="Clear search" shortcut="Esc" onClick={clear} />
            )}
            <IconButton
              icon={ClipboardPaste}
              label="Paste"
              shortcut={modifier && `${modifier}V`}
              onClick={() => void pasteFromClipboard()}
            />
            <IconButton
              icon={FileUp}
              label="Choose a file"
              onClick={() => fileRef.current?.click()}
            />
            <IconButton
              icon={Dices}
              label="I'm feeling lucky"
              onClick={() => router.push(randomTool().href)}
            />
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          data-testid="tool-search-file"
          onChange={(event) => {
            const chosen = Array.from(event.target.files ?? []);
            if (chosen.length > 0) takeFiles(chosen);
            event.target.value = "";
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Suggestions" role="group">
        {SEARCH_PROMPTS.map((prompt) => (
          <button
            key={prompt.label}
            type="button"
            aria-pressed={query === prompt.query}
            onClick={() => {
              search(prompt.query);
              inputRef.current?.focus();
            }}
            className={cn(
              "paper paper-lift bg-background text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 rounded-full border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-3",
              "aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-primary"
            )}
          >
            {prompt.label}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground mt-3 text-sm">
        Or drop, paste or choose a file to see which tools open it.
      </p>

      {hasFiles ? (
        <FileMatches files={files} onClear={clear} />
      ) : searching ? (
        <section
          id="tool-search-results"
          aria-label="Search results"
          className="animate-in fade-in slide-in-from-top-1 mt-8 duration-200"
        >
          <output aria-live="polite" className="text-muted-foreground mb-4 block text-sm">
            {results.length === 0
              ? `Nothing matches "${query.trim()}" yet. Try a suggestion above.`
              : `${results.length} ${results.length === 1 ? "tool" : "tools"}`}
          </output>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </section>
      ) : (
        children
      )}
    </>
  );
}

export type { ToolSearchProps };
