"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";

import { convertBase64, type Base64Mode } from "@/lib/text/base64";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/atoms/copy-button";

export function Base64Tool() {
  const [mode, setMode] = useState<Base64Mode>("encode");
  const [urlSafe, setUrlSafe] = useState(false);
  const [input, setInput] = useState("");

  const result = useMemo(
    () => convertBase64(input, mode, urlSafe),
    [input, mode, urlSafe],
  );

  // Swap direction and carry a successful result across as the new input.
  const swap = () => {
    setMode((prev) => (prev === "encode" ? "decode" : "encode"));
    if (result.ok && result.value) setInput(result.value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Mode">
            {(["encode", "decode"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => setMode(value)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  mode === value ? "border-primary bg-accent" : "hover:bg-accent/50"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={urlSafe}
            onClick={() => setUrlSafe((prev) => !prev)}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              urlSafe ? "border-primary bg-accent" : "hover:bg-accent/50"
            }`}
          >
            URL-safe
          </button>
        </CardContent>
      </Card>

      <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <Card>
          <CardContent className="space-y-2">
            <Label htmlFor="b64-input">
              {mode === "encode" ? "Plain text" : "Base64"}
            </Label>
            <Textarea
              id="b64-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={mode === "encode" ? "Type or paste text…" : "Paste Base64…"}
              className="min-h-52 font-mono"
              spellCheck={false}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-center">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Swap input and output"
            onClick={swap}
            className="rotate-90 lg:rotate-0"
          >
            <ArrowDownUp />
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{mode === "encode" ? "Base64" : "Plain text"}</Label>
              <CopyButton value={result.value} disabled={!result.ok || !result.value} />
            </div>
            <Textarea
              readOnly
              value={result.ok ? result.value : ""}
              placeholder="Result appears here…"
              className="min-h-52 font-mono"
              aria-invalid={!result.ok}
              spellCheck={false}
            />
            {!result.ok && result.error && (
              <p className="text-destructive text-xs">{result.error}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
