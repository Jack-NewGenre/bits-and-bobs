"use client";

import { useMemo, useState } from "react";

import { FLAGS, toSegments } from "@/lib/text/regex";
import { useRegexRun } from "@/hooks/use-regex-run";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/atoms/copy-button";
import { TextAreaField } from "@/components/atoms/text-area-field";
import { TextPane } from "@/components/molecules/text-pane";
import { TwoPane } from "@/components/atoms/two-pane";
import { ResultError } from "@/components/atoms/result-error";
import { CaptureList } from "@/components/organisms/tools/regex-tester/capture-list";
import { MatchHighlight } from "@/components/organisms/tools/regex-tester/match-highlight";

const SAMPLE_TEXT = `Ada Lovelace <ada@example.com>
Alan Turing <alan@example.org>
Grace Hopper <grace@navy.mil>`;

export function RegexTesterTool() {
  const [pattern, setPattern] = useState("(\\w+)@([\\w.]+)");
  const [flags, setFlags] = useState<string[]>(["g"]);
  const [input, setInput] = useState(SAMPLE_TEXT);
  const [replacement, setReplacement] = useState("");

  const flagString = flags.join("");
  const { result, replaced, timedOut } = useRegexRun(
    pattern,
    flagString,
    input,
    replacement,
  );

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
            <ResultError
              message={
                timedOut
                  ? "This pattern took too long and was stopped. Nested quantifiers such as (a+)+ can backtrack exponentially on text that does not match."
                  : (result.error ?? "")
              }
            />
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
          <MatchHighlight segments={segments} />
        </TextPane>
      </TwoPane>

      {!timedOut && result.matches.some((match) => match.groups.length > 0) && (
        <CaptureList matches={result.matches} />
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
