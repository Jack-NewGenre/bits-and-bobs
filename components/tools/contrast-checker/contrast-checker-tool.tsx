"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

import {
  type Rgb,
} from "@/lib/colour";
import {
  formatHex,
} from "@/lib/colour-format";
import { gradeContrast } from "@/lib/colour-contrast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ColourInput } from "@/components/shared/colour-input";

const INITIAL_TEXT: Rgb = { r: 71, g: 85, b: 105, a: 1 };
const INITIAL_BACKGROUND: Rgb = { r: 255, g: 255, b: 255, a: 1 };

const CHECKS: { key: "normalAa" | "normalAaa" | "largeAa" | "largeAaa" | "uiAa"; label: string; needs: string }[] = [
  { key: "normalAa", label: "Body text (AA)", needs: "4.5:1" },
  { key: "normalAaa", label: "Body text (AAA)", needs: "7:1" },
  { key: "largeAa", label: "Large text (AA)", needs: "3:1" },
  { key: "largeAaa", label: "Large text (AAA)", needs: "4.5:1" },
  { key: "uiAa", label: "Icons & borders (AA)", needs: "3:1" },
];

export function ContrastCheckerTool() {
  const [text, setText] = useState<Rgb>(INITIAL_TEXT);
  const [background, setBackground] = useState<Rgb>(INITIAL_BACKGROUND);

  const report = gradeContrast(text, background);
  const passing = report.level !== "Fail";

  const swap = () => {
    setText(background);
    setBackground(text);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Card>
        <CardContent className="space-y-5">
          <ColourInput label="Text" value={text} onChange={setText} />
          <ColourInput
            label="Background"
            value={background}
            onChange={setBackground}
          />
          <Button type="button" variant="outline" onClick={swap} className="w-full">
            Swap
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <div
            style={{
              backgroundColor: formatHex(background),
              color: formatHex(text),
            }}
            className="space-y-2 rounded-lg border p-5"
          >
            <p className="text-2xl font-semibold">Large text looks like this</p>
            <p className="text-sm">
              And body copy looks like this, the size most of a page is set in,
              and the one that has to pass 4.5:1.
            </p>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-semibold tabular-nums">
              {report.ratio.toFixed(2)}:1
            </span>
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-medium",
                passing
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/15 text-destructive",
              )}
            >
              {report.level}
            </span>
          </div>

          <ul className="space-y-1.5">
            {CHECKS.map(({ key, label, needs }) => (
              <li
                key={key}
                className="flex items-center gap-2 text-sm"
              >
                {report[key] ? (
                  <Check className="size-4 shrink-0 text-emerald-500" />
                ) : (
                  <X className="text-destructive size-4 shrink-0" />
                )}
                <span>{label}</span>
                <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                  needs {needs}
                </span>
              </li>
            ))}
          </ul>

          {text.a < 1 && (
            <p className="text-muted-foreground text-xs">
              The text is translucent, so it is measured as it will actually
              appear, mixed onto the background first.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
