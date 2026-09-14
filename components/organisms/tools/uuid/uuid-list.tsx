"use client";

import { useState, type MouseEvent } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { useCopy } from "@/hooks/use-copy";

interface UuidListProps {
  uuids: string[];
}

/**
 * The generated list, up to a thousand rows.
 *
 * One copy hook and one click handler serve the whole list, rather than a
 * `CopyButton` per row: at the maximum count that would be four thousand hooks
 * and four thousand extra elements, all to do the same job. The row that was
 * clicked is found from the event instead.
 */
export function UuidList({ uuids }: UuidListProps) {
  // The hook owns the timing, so the tick clears itself the way it does on
  // every other copy control; this only remembers which row it belongs to.
  const { copied, copy } = useCopy();
  const [copiedId, setCopiedId] = useState<string>();

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const row = (event.target as HTMLElement).closest<HTMLElement>("[data-uuid]");
    const uuid = row?.dataset.uuid;
    if (!uuid) return;

    void copy(uuid).then((ok) => {
      if (!ok) {
        toast.error("Your browser blocked the clipboard. Select and copy manually.");
        return;
      }
      setCopiedId(uuid);
    });
  };

  return (
    <div
      onClick={handleClick}
      className="divide-border max-h-[460px] divide-y overflow-auto rounded-lg border"
    >
      {uuids.map((uuid, index) => {
        const isCopied = copied && copiedId === uuid;
        return (
          <button
            key={`${uuid}-${index}`}
            type="button"
            data-uuid={uuid}
            aria-label={isCopied ? `Copied ${uuid}` : `Copy ${uuid}`}
            className="hover:bg-accent/40 focus-visible:ring-ring flex w-full items-center justify-between gap-2 px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset"
          >
            <code className="font-mono text-sm break-all">{uuid}</code>
            {isCopied ? (
              <Check className="size-4 shrink-0 text-emerald-500" />
            ) : (
              <Copy className="text-muted-foreground size-4 shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}
