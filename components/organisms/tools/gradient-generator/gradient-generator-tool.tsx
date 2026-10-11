"use client";

import { useState } from "react";
import { Dices } from "lucide-react";
import { toast } from "sonner";

import { downloadBlob } from "@/lib/download";
import { canvasToBlob } from "@/lib/image/canvas";
import {
  randomGradient,
  renderGradient,
  toCssGradient,
  type Gradient,
  type GradientKind,
} from "@/lib/colour/gradient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/atoms/copy-button";
import { DownloadButton } from "@/components/atoms/download-button";
import { SliderRow } from "@/components/atoms/slider-row";
import { OptionGroup } from "@/components/molecules/option-group";
import { GradientStopList } from "@/components/organisms/tools/gradient-generator/gradient-stop-list";

const INITIAL: Gradient = {
  kind: "linear",
  angle: 90,
  stops: [
    { colour: { r: 59, g: 130, b: 246, a: 1 }, position: 0 },
    { colour: { r: 236, g: 72, b: 153, a: 1 }, position: 100 },
  ],
};

const KIND_CHOICES: { value: GradientKind; label: string }[] = [
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
  { value: "conic", label: "Conic" },
];

const EXPORT_SIZE = { width: 1920, height: 1080 };

export function GradientGeneratorTool() {
  const [gradient, setGradient] = useState<Gradient>(INITIAL);
  const [exporting, setExporting] = useState(false);
  const css = toCssGradient(gradient);

  const exportPng = async () => {
    setExporting(true);
    try {
      const canvas = renderGradient(
        gradient,
        EXPORT_SIZE.width,
        EXPORT_SIZE.height,
      );
      downloadBlob(await canvasToBlob(canvas, "image/png"), "gradient.png");
    } catch {
      toast.error("This browser could not draw the gradient.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card>
        <CardContent className="space-y-5">
          <OptionGroup
            label="Type"
            choices={KIND_CHOICES}
            value={gradient.kind}
            onChange={(kind) => setGradient({ ...gradient, kind })}
            columns={3}
          />

          {gradient.kind !== "radial" && (
            <SliderRow
              label={gradient.kind === "conic" ? "Start angle" : "Angle"}
              value={gradient.angle}
              min={0}
              max={360}
              onChange={(angle) => setGradient({ ...gradient, angle })}
            />
          )}

          <GradientStopList
            stops={gradient.stops}
            onChange={(stops) => setGradient({ ...gradient, stops })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div
            role="img"
            aria-label="Gradient preview"
            className="aspect-video w-full rounded-xl border"
            style={{ backgroundImage: css }}
          />

          <code className="bg-muted block rounded-md px-3 py-2 font-mono text-xs break-all">
            background-image: {css};
          </code>

          <div className="flex flex-wrap items-center gap-2">
            <CopyButton
              value={`background-image: ${css};`}
              label="Copy CSS"
              size="default"
            />
            <DownloadButton
              onClick={exportPng}
              busy={exporting}
              label="Download PNG"
              variant="outline"
              className="w-auto"
            />
            <Button
              variant="secondary"
              className="ml-auto"
              onClick={() => setGradient(randomGradient(gradient.kind))}
            >
              <Dices />
              Random
            </Button>
          </div>

          <p className="text-muted-foreground text-xs">
            Blended in OKLab, so the middle of a gradient stays as bright and
            saturated as its ends instead of fading through grey. The PNG is
            1920×1080 and blends the same way.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
