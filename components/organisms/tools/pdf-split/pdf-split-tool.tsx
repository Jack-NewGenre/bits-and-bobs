"use client";

import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { baseName, usePdfFiles } from "@/hooks/use-pdf-files";
import { extractPages, splitToPages } from "@/lib/pdf/pdf-edit";
import {
  formatPageRanges,
  invertSelection,
  parsePageRanges,
} from "@/lib/pdf/pdf-pages";
import { downloadBlob, downloadZip } from "@/lib/download";
import {
  MAX_PDF_BYTES,
  PDF_TYPES,
} from "@/components/molecules/image-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageDropzone } from "@/components/molecules/image-dropzone";
import { PdfFileList } from "@/components/molecules/pdf-file-list";
import { PillButton } from "@/components/atoms/pill-button";

type Mode = "extract" | "remove" | "every";

const MODES: { value: Mode; label: string; hint: string }[] = [
  {
    value: "extract",
    label: "Keep these",
    hint: "Build one PDF from just the pages you list.",
  },
  {
    value: "remove",
    label: "Remove these",
    hint: "Build one PDF from everything except the pages you list.",
  },
  {
    value: "every",
    label: "Every page",
    hint: "One file per page, delivered as a zip.",
  },
];

export function PdfSplitTool() {
  const { files, usable, add, remove, clear, handleReject } = usePdfFiles({
    single: true,
  });
  const [mode, setMode] = useState<Mode>("extract");
  const [ranges, setRanges] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const source = usable[0];
  const total = source?.info?.pageCount ?? 0;

  const selection = useMemo(
    () => parsePageRanges(ranges, total),
    [ranges, total],
  );
  const chosen =
    mode === "remove"
      ? invertSelection(selection.pages, total)
      : selection.pages;

  const handleRun = async () => {
    if (!source) return;
    setIsWorking(true);

    try {
      if (mode === "every") {
        const parts = await splitToPages(source.file, baseName(source.name));
        await downloadZip(parts, `${baseName(source.name)}-pages.zip`);
        toast.success(`Split into ${parts.length} files`);
        return;
      }

      const output = await extractPages(source.file, chosen);
      downloadBlob(output, `${baseName(source.name)}-${mode}.pdf`);
      toast.success(`Made a ${chosen.length}-page PDF`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not split that file",
      );
    } finally {
      setIsWorking(false);
    }
  };

  const active = MODES.find((entry) => entry.value === mode);
  const canRun = source && (mode === "every" || chosen.length > 0);

  return (
    <div className="space-y-6">
      <ImageDropzone
        onFiles={add}
        onReject={handleReject}
        accept={PDF_TYPES}
        maxBytes={MAX_PDF_BYTES}
        single
        prompt="Drop a PDF here, or click to browse"
        hint="PDF · up to 200MB · split on your device"
      />

      {files.length > 0 && (
        <Card>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Document</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clear}
                className="text-muted-foreground"
              >
                Clear
              </Button>
            </div>

            <PdfFileList files={files} onRemove={remove} />

            {source && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">What to do</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {MODES.map((entry) => (
                      <PillButton
                        key={entry.value}
                        active={mode === entry.value}
                        ariaPressed={mode === entry.value}
                        onClick={() => setMode(entry.value)}
                      >
                        {entry.label}
                      </PillButton>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">{active?.hint}</p>
                </div>

                {mode !== "every" && (
                  <div className="space-y-2">
                    <Label className="text-xs" htmlFor="ranges">
                      Pages
                    </Label>
                    <Input
                      id="ranges"
                      value={ranges}
                      spellCheck={false}
                      placeholder={`e.g. 1-3, 5, 8- (this document has ${total})`}
                      onChange={(event) => setRanges(event.target.value)}
                      className="font-mono text-sm"
                    />
                    {selection.ignored.length > 0 && (
                      <p className="text-muted-foreground text-xs">
                        Ignored: {selection.ignored.join(", ")}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs">
                      {chosen.length === 0
                        ? "No pages selected yet."
                        : `Keeping ${chosen.length} of ${total}: ${formatPageRanges(chosen)}`}
                    </p>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleRun}
                  disabled={!canRun || isWorking}
                  className="w-full"
                >
                  {isWorking ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  {mode === "every"
                    ? `Split into ${total} files`
                    : `Download ${chosen.length} pages`}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
