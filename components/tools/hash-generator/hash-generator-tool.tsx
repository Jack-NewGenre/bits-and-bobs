"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import {
  DEFAULT_ALGORITHM,
  digestsMatch,
  hashBytes,
  hashText,
  HASH_ALGORITHMS,
  type HashAlgorithm,
  type HashResult,
} from "@/lib/hash";
import { formatBytes } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/shared/copy-button";
import { PillButton } from "@/components/shared/pill-button";
import { TextAreaField, TextPane } from "@/components/shared/text-tool-layout";

interface Source {
  kind: "text" | "file";
  name?: string;
  size?: number;
}

export function HashGeneratorTool() {
  const [text, setText] = useState("");
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>(DEFAULT_ALGORITHM);
  const [file, setFile] = useState<File>();
  const [result, setResult] = useState<HashResult>();
  const [expected, setExpected] = useState("");

  const source: Source = file
    ? { kind: "file", name: file.name, size: file.size }
    : { kind: "text" };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const digest = file
        ? await hashBytes(await file.arrayBuffer(), algorithm)
        : await hashText(text, algorithm);
      if (!cancelled) setResult(digest);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [text, file, algorithm]);

  const option = HASH_ALGORITHMS.find((entry) => entry.value === algorithm);
  const comparison =
    expected.trim() === "" || !result
      ? undefined
      : digestsMatch(result.hex, expected);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-2">
          <Label className="text-xs">Algorithm</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {HASH_ALGORITHMS.map((entry) => (
              <PillButton
                key={entry.value}
                active={algorithm === entry.value}
                ariaPressed={algorithm === entry.value}
                onClick={() => setAlgorithm(entry.value)}
              >
                {entry.label}
              </PillButton>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            {option?.note ??
              "MD5 is missing on purpose: browsers do not ship it, because it has been forgeable for twenty years."}
          </p>
        </CardContent>
      </Card>

      <TextPane
        label={source.kind === "file" ? `File: ${source.name}` : "Text"}
        aside={
          <div className="flex items-center gap-2">
            {file && (
              <>
                <span className="text-muted-foreground text-xs">
                  {formatBytes(source.size ?? 0)}
                </span>
                <PillButton size="sm" active={false} onClick={() => setFile(undefined)}>
                  Use text instead
                </PillButton>
              </>
            )}
            <label className="cursor-pointer">
              <span className="border-input hover:bg-accent/50 rounded-md border px-2 py-0.5 text-xs font-medium">
                Hash a file
              </span>
              <input
                type="file"
                hidden
                aria-label="Hash a file"
                onChange={(event) => {
                  setFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
        }
      >
        {file ? (
          <p className="text-muted-foreground flex min-h-40 items-center justify-center rounded-md border border-dashed text-sm">
            Hashing the file&apos;s bytes, not its name.
          </p>
        ) : (
          <TextAreaField
            ariaLabel="Text to hash"
            value={text}
            onChange={setText}
            placeholder="Type or paste anything…"
            className="min-h-40"
          />
        )}
      </TextPane>

      <Card>
        <CardContent className="space-y-4">
          {(["hex", "base64"] as const).map((encoding) => (
            <div key={encoding} className="space-y-1.5">
              <Label className="text-xs uppercase">{encoding}</Label>
              <div className="flex items-center gap-2">
                <code className="bg-muted flex-1 overflow-x-auto rounded-md px-3 py-2 font-mono text-sm break-all">
                  {result?.[encoding] ?? "…"}
                </code>
                <CopyButton
                  value={result?.[encoding] ?? ""}
                  iconOnly
                  label={`Copy ${encoding}`}
                  disabled={!result}
                />
              </div>
            </div>
          ))}

          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="expected">
              Compare against a published digest
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="expected"
                value={expected}
                spellCheck={false}
                placeholder="Paste the checksum you were given…"
                onChange={(event) => setExpected(event.target.value)}
                className="font-mono text-sm"
              />
              {comparison !== undefined &&
                (comparison ? (
                  <span className="flex items-center gap-1 text-sm text-emerald-500">
                    <Check className="size-4" /> Match
                  </span>
                ) : (
                  <span className="text-destructive flex items-center gap-1 text-sm">
                    <X className="size-4" /> No match
                  </span>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
