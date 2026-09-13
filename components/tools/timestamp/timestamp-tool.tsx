"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";

import {
  describeTimestamp,
  parseDate,
  parseTimestamp,
  type TimestampParts,
} from "@/lib/text/timestamp";
import { useClientSeed, useHydrated } from "@/hooks/use-client-seed";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/shared/copy-button";

type Mode = "timestamp" | "date";

const RESULT_ROWS: { key: keyof TimestampParts; label: string }[] = [
  { key: "unixSeconds", label: "Unix (seconds)" },
  { key: "unixMillis", label: "Unix (millis)" },
  { key: "iso", label: "ISO 8601" },
  { key: "utc", label: "UTC" },
  { key: "local", label: "Local" },
  { key: "relative", label: "Relative" },
];

/** Stable, so the seed runs exactly once. */
const readClock = () => Date.now();

export function TimestampTool() {
  const [mode, setMode] = useState<Mode>("timestamp");
  const [input, setInput] = useState("");
  // A live "now" so the relative time and the default reading stay current.
  // The clock is client-only: the server has a different one, and rendering
  // it would make the two disagree at hydration.
  const [now, setNow] = useClientSeed(readClock, 0);
  const mounted = useHydrated();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [setNow]);

  const parsed = useMemo(() => {
    // Only show the live "current time" after mount so SSR renders no output
    // for the empty-input state, avoiding a hydration mismatch.
    if (input.trim() === "") return mounted ? ({ ms: now } as const) : null;
    return mode === "timestamp" ? parseTimestamp(input) : parseDate(input);
  }, [input, mode, now, mounted]);

  const parts = parsed ? describeTimestamp(parsed.ms, now) : null;
  const usingNow = input.trim() === "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Convert from">
            {(["timestamp", "date"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => setMode(value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  mode === value ? "border-primary bg-accent" : "hover:bg-accent/50"
                }`}
              >
                {value === "timestamp" ? "From Unix timestamp" : "From date string"}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="ts-input">
                {mode === "timestamp" ? "Timestamp" : "Date"}
              </Label>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => setInput("")}
              >
                <Clock />
                Use now
              </Button>
            </div>
            <Input
              id="ts-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                mode === "timestamp" ? "e.g. 1700000000" : "e.g. 2023-11-14 22:13"
              }
              aria-invalid={!usingNow && !parsed}
            />
            {!usingNow && !parsed && (
              <p className="text-destructive text-xs">
                {mode === "timestamp"
                  ? "Enter a numeric Unix timestamp."
                  : "Could not parse that date."}
              </p>
            )}
            {usingNow && (
              <p className="text-muted-foreground text-xs">
                Showing the current time. Type a value to convert.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {parts && (
        <Card>
          <CardContent className="divide-border divide-y p-0">
            {RESULT_ROWS.map(({ key, label }) => (
              <div
                key={key}
                className="hover:bg-accent/40 flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <code className="font-mono text-sm break-all">
                    {String(parts[key])}
                  </code>
                </div>
                <CopyButton value={String(parts[key])} iconOnly variant="ghost" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
