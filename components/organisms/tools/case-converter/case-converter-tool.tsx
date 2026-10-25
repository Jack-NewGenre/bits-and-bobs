"use client";

import { useMemo, useState } from "react";

import { CASES, convertCase } from "@/lib/text/case";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/atoms/copy-button";

export function CaseConverterTool() {
  const [input, setInput] = useState("");

  const results = useMemo(
    () =>
      input.trim()
        ? CASES.map((option) => ({ ...option, value: convertCase(input, option.id) }))
        : [],
    [input]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-2">
          <Label htmlFor="case-input">Text</Label>
          <Textarea
            id="case-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type or paste text, or a list of names, one per line…"
            className="min-h-32 font-mono"
            spellCheck={false}
          />
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardContent className="divide-border divide-y p-0">
            {results.map(({ id, label, value }) => (
              <div
                key={id}
                className="hover:bg-accent/40 flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <code className="font-mono text-sm break-all whitespace-pre-wrap">{value}</code>
                </div>
                <CopyButton
                  value={value}
                  iconOnly
                  variant="ghost"
                  label={`Copy ${label}`}
                  disabled={!value.trim()}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
