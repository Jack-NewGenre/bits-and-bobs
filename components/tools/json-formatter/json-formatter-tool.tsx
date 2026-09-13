"use client";

import { useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";

import {
  DEFAULT_JSON_OPTIONS,
  INDENT_OPTIONS,
  processJson,
  type Indent,
  type JsonOptions,
} from "@/lib/text/json-format";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/shared/copy-button";
import { PillButton } from "@/components/shared/pill-button";
import {
  TextAreaField,
  TextPane,
  TwoPane,
} from "@/components/shared/text-tool-layout";

const SAMPLE = '{"name":"Ada","tags":["maths","engines"],"active":true}';

const MODES: { value: JsonOptions["mode"]; label: string }[] = [
  { value: "format", label: "Format" },
  { value: "minify", label: "Minify" },
];

const INDENTS: { value: Indent; label: string }[] = [
  ...INDENT_OPTIONS.map((value) => ({ value: value as Indent, label: `${value} spaces` })),
  { value: "tab", label: "Tab" },
];

export function JsonFormatterTool() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<JsonOptions>(DEFAULT_JSON_OPTIONS);

  const result = useMemo(() => processJson(input, options), [input, options]);
  const set = <K extends keyof JsonOptions>(key: K, value: JsonOptions[K]) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Output</Label>
            <div className="flex gap-2">
              {MODES.map(({ value, label }) => (
                <PillButton
                  key={value}
                  active={options.mode === value}
                  ariaPressed={options.mode === value}
                  onClick={() => set("mode", value)}
                >
                  {label}
                </PillButton>
              ))}
            </div>
          </div>

          {options.mode === "format" && (
            <div className="space-y-2">
              <Label className="text-xs">Indent</Label>
              <div className="flex gap-2">
                {INDENTS.map(({ value, label }) => (
                  <PillButton
                    key={String(value)}
                    active={options.indent === value}
                    ariaPressed={options.indent === value}
                    onClick={() => set("indent", value)}
                  >
                    {label}
                  </PillButton>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Keys</Label>
            <PillButton
              active={options.sort}
              ariaPressed={options.sort}
              onClick={() => set("sort", !options.sort)}
            >
              Sort A–Z
            </PillButton>
          </div>
        </CardContent>
      </Card>

      <TwoPane>
        <TextPane
          label="Input"
          aside={
            input === "" && (
              <PillButton size="sm" active={false} onClick={() => setInput(SAMPLE)}>
                Paste a sample
              </PillButton>
            )
          }
        >
          <TextAreaField
            ariaLabel="JSON input"
            value={input}
            onChange={setInput}
            placeholder='{ "paste": "your JSON here" }'
          />
        </TextPane>

        <TextPane
          label="Output"
          aside={
            result.stats && (
              <span className="text-muted-foreground text-xs">
                {result.stats.keys} keys · {result.stats.items} items · depth{" "}
                {result.stats.depth}
              </span>
            )
          }
        >
          {result.error ? (
            <div className="border-destructive/40 bg-destructive/10 flex flex-1 items-start gap-2 rounded-md border p-3">
              <TriangleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium">{result.error.message}</p>
                {result.error.line !== undefined && (
                  <p className="text-muted-foreground text-xs">
                    Line {result.error.line}, column {result.error.column}
                  </p>
                )}
                {result.error.excerpt && (
                  <pre className="bg-muted overflow-x-auto rounded p-2 font-mono text-xs">
                    {result.error.excerpt}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <TextAreaField ariaLabel="JSON output" value={result.value} readOnly />
          )}

          {result.lossyNumbers && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <div className="min-w-0 space-y-1 text-xs">
                <p className="font-medium">
                  {result.lossyNumbers.length === 1
                    ? "One number changed value"
                    : `${result.lossyNumbers.length} numbers changed value`}
                </p>
                <p className="text-muted-foreground">
                  JavaScript holds every number as a float64, so these are
                  beyond what it can represent exactly. Quote them as strings
                  to keep them intact.
                </p>
                <code className="block font-mono break-all">
                  {result.lossyNumbers.join(", ")}
                </code>
              </div>
            </div>
          )}

          <CopyButton value={result.value} disabled={!result.ok || result.value === ""} />
        </TextPane>
      </TwoPane>
    </div>
  );
}
