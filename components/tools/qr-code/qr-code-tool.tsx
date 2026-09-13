"use client";

import { useMemo, useState } from "react";
import { Download, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { useQrCode } from "@/hooks/use-qr-code";
import {
  checkScannability,
  DEFAULT_QR_SETTINGS,
  svgToPng,
  type QrSettings,
} from "@/lib/generators/qr";
import { downloadBlob } from "@/lib/download";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/atoms/copy-button";
import { TextAreaField } from "@/components/atoms/text-area-field";
import { QrOptions } from "@/components/tools/qr-code/qr-options";

const SAMPLE = "https://example.com";

export function QrCodeTool() {
  const [text, setText] = useState(SAMPLE);
  const [settings, setSettings] = useState<QrSettings>(DEFAULT_QR_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  const code = useQrCode(text, settings);
  const warnings = useMemo(() => checkScannability(settings), [settings]);

  const handlePng = async () => {
    if (!code.svg) return;
    setIsSaving(true);
    try {
      downloadBlob(await svgToPng(code.svg, settings.size), "qr-code.png");
    } catch {
      toast.error("Could not render the PNG");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSvg = () => {
    if (!code.svg) return;
    downloadBlob(new Blob([code.svg], { type: "image/svg+xml" }), "qr-code.svg");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-2">
            <Label className="text-xs" htmlFor="qr-text">
              Text or URL
            </Label>
            <TextAreaField
              ariaLabel="Text or URL"
              value={text}
              onChange={setText}
              placeholder="https://example.com, a phone number, some plain text…"
              className="min-h-24"
            />
            <p className="text-muted-foreground text-xs">
              Everything is encoded on your device. The text never leaves it.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <QrOptions settings={settings} onChange={setSettings} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div
            style={{ backgroundColor: settings.background }}
            className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border"
          >
            {code.svg ? (
              // The SVG is generated here from the user's own text, so there
              // is no third-party markup to sanitise.
              <div
                className="size-full [&>svg]:size-full"
                dangerouslySetInnerHTML={{ __html: code.svg }}
              />
            ) : (
              // The reason lives in the banner below, so this stays a short
              // neutral line rather than repeating the whole explanation.
              <p className="text-muted-foreground p-6 text-center text-sm">
                {code.error ? "No code to show" : "Type something to make a code."}
              </p>
            )}
          </div>

          {code.size && (
            <p className="text-muted-foreground text-xs">
              {code.size} × {code.size} modules · {text.length} characters
              encoded
            </p>
          )}

          {warnings.map((warning) => (
            <div
              key={warning.kind}
              className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <p className="text-xs">{warning.message}</p>
            </div>
          ))}

          {code.error && (
            <div className="border-destructive/40 bg-destructive/10 flex items-start gap-2 rounded-md border p-3">
              <TriangleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
              <p className="text-xs">{code.error}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={code.svg ? "default" : "secondary"}
              onClick={handlePng}
              disabled={!code.svg || isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              PNG
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSvg}
              disabled={!code.svg}
              className="flex-1"
            >
              <Download className="size-4" />
              SVG
            </Button>
            <CopyButton
              value={() => code.svg ?? ""}
              label="Copy SVG"
              size="default"
              disabled={!code.svg}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
