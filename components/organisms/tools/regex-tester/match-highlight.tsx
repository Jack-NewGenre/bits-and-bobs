import type { Segment } from "@/lib/text/regex";

interface MatchHighlightProps {
  segments: Segment[];
}

/** The test text with every match marked, the way a highlighter would. */
export function MatchHighlight({ segments }: MatchHighlightProps) {
  return (
    <div className="bg-muted min-h-48 flex-1 overflow-auto rounded-md p-3 font-mono text-sm whitespace-pre-wrap">
      {segments.map((segment, index) =>
        segment.isMatch ? (
          <mark key={index} className="rounded bg-emerald-500/30 text-inherit">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </div>
  );
}

export type { MatchHighlightProps };
