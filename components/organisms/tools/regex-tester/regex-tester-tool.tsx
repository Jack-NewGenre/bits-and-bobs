"use client";

import { useEffect, useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";

import { FLAGS, toSegments } from "@/lib/text/regex";
import {
  RegexTimeout,
  runRegexSafely,
  type RegexRun,
} from "@/lib/workers/text-worker-client";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/atoms/copy-button";
import { TextAreaField } from "@/components/atoms/text-area-field";
import { TextPane } from "@/components/molecules/text-pane";
import { TwoPane } from "@/components/atoms/two-pane";

const SAMPLE_TEXT = `Ada Lovelace <ada@example.com>
Alan Turing <alan@example.org>
Grace Hopper <grace@navy.mil>`;

export function RegexTesterTool() {
  const [pattern, setPattern] = useState("(\\w+)@([\\w.]+)");
  const [flags, setFlags] = useState<string[]>(["g"]);
  const [input, setInput] = useState(SAMPLE_TEXT);
  const [replacement, setReplacement] = useState("");

  const flagString = flags.join("");
  const [run, setRun] = useState<RegexRun>({
    result: { ok: true, matches: [], truncated: false },
  });
  const [timedOut, setTimedOut] = useState(false);

  // Matching and replacing both run in the worker, under one deadline, so a
  // runaway pattern is killed rather than freezing the page. Running the
  // replacement here instead would put the same backtracking straight back on
  // the main thread, where nothing can stop it. The state is set from a
  // promise, never synchronously.
  useEffect(() => {
    let cancelled = false;

    runRegexSafely(pattern, flagString, input, {
      replacement: replacement === "" ? undefined : replacement,
    })
      .then((next) => {
        if (cancelled) return;
        setRun(next);
        setTimedOut(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setTimedOut(error instanceof RegexTimeout);
      });

    return () => {
      cancelled = true;
    };
  }, [pattern, flagString, input, replacement]);

  const result = run.result;
  const replaced = timedOut ? undefined : run.replaced;

  const segments = useMemo(
    () => toSegments(input, timedOut ? [] : result.matches),
    [input, result.matches, timedOut],
  );

  const toggleFlag = (flag: string) =>
    setFlags((prev) =>
      prev.includes(flag) ? prev.filter((entry) => entry !== flag) : [...prev, flag],
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3">
          <Label className="text-xs" htmlFor="pattern">
            Pattern
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground font-mono text-sm">/</span>
            <Input
              id="pattern"
              value={pattern}
              spellCheck={false}
              onChange={(event) => setPattern(event.target.value)}
              aria-invalid={!result.ok || timedOut}
              className="min-w-40 flex-1 font-mono text-sm"
            />
            <span className="text-muted-foreground font-mono text-sm">/</span>
            <div className="flex gap-1">
              {FLAGS.map((flag) => (
                <button
                  key={flag.value}
                  type="button"
                  title={flag.title}
                  aria-pressed={flags.includes(flag.value)}
                  onClick={() => toggleFlag(flag.value)}
                  className={cn(
                    "size-8 rounded-md border font-mono text-sm transition-colors",
                    flags.includes(flag.value)
                      ? "border-primary bg-accent"
                      : "hover:bg-accent/50",
                  )}
                >
                  {flag.label}
                </button>
              ))}
            </div>
          </div>

          {(result.error || timedOut) && (
            <p className="text-destructive flex items-start gap-2 text-xs">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              {timedOut
                ? "This pattern took too long and was stopped. Nested quantifiers such as (a+)+ can backtrack exponentially on text that does not match."
                : result.error}
            </p>
          )}
        </CardContent>
      </Card>

      <TwoPane>
        <TextPane label="Test against">
          <TextAreaField
            ariaLabel="Test text"
            value={input}
            onChange={setInput}
            className="min-h-48"
          />
        </TextPane>

        <TextPane
          label="Matches"
          aside={
            <span className="text-muted-foreground text-xs">
              {timedOut ? "-" : result.matches.length}
              {!timedOut && result.truncated && "+ (capped)"}
            </span>
          }
        >
          <div className="bg-muted min-h-48 flex-1 overflow-auto rounded-md p-3 font-mono text-sm whitespace-pre-wrap">
            {segments.map((segment, index) =>
              segment.isMatch ? (
                <mark
                  key={index}
                  className="rounded bg-emerald-500/30 text-inherit"
                >
                  {segment.text}
                </mark>
              ) : (
                <span key={index}>{segment.text}</span>
              ),
            )}
          </div>
        </TextPane>
      </TwoPane>

      {!timedOut &&
        result.matches.length > 0 &&
        result.matches.some((m) => m.groups.length > 0) && (
        <Card>
          <CardContent className="space-y-2">
            <Label className="text-xs">Captures</Label>
            <ul className="divide-border divide-y text-sm">
              {result.matches.slice(0, 20).map((match, index) => (
                <li key={index} className="flex flex-wrap items-baseline gap-x-3 py-2">
                  <span className="text-muted-foreground w-16 shrink-0 text-xs tabular-nums">
                    at {match.index}
                  </span>
                  <code className="font-mono">{match.text}</code>
                  {match.groups.map((group) => (
                    <span key={group.name} className="text-muted-foreground text-xs">
                      {group.name}: <code className="font-mono">{group.value ?? "-"}</code>
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        )}

      <Card>
        <CardContent className="space-y-3">
          <Label className="text-xs" htmlFor="replacement">
            Replace with
          </Label>
          <Input
            id="replacement"
            value={replacement}
            spellCheck={false}
            placeholder="$1 at $2, leave blank to skip"
            onChange={(event) => setReplacement(event.target.value)}
            className="font-mono text-sm"
          />
          {replaced?.ok && (
            <div className="space-y-2">
              <pre className="bg-muted max-h-48 overflow-auto rounded-md p-3 font-mono text-sm whitespace-pre-wrap">
                {replaced.value}
              </pre>
              <CopyButton value={replaced.value} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
