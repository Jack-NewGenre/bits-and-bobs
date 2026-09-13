"use client";

import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { baseName, usePdfFiles } from "@/hooks/use-pdf-files";
import { renderPages } from "@/lib/pdf/pdf";
import { formatPageRanges, parsePageRanges } from "@/lib/pdf/pdf-pages";
import { downloadBlob } from "@/lib/download";
import { downloadZip } from "@/lib/zip";
import {
  MAX_PDF_BYTES,
  PDF_TYPES,
} from "@/lib/image/file-intake";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ImageDropzone } from "@/components/molecules/image-dropzone";
import { PdfFileList } from "@/components/molecules/pdf-file-list";
import { DownloadButton } from "@/components/atoms/download-button";
import { OptionGroup } from "@/components/molecules/option-group";
import { ListHeader } from "@/components/molecules/list-header";

const RESOLUTIONS = [
  { value: 800, label: "Screen", note: "800px" },
  { value: 1600, label: "Retina", note: "1600px" },
  { value: 3000, label: "Print", note: "3000px" },
] as const;

export function PdfToImagesTool() {
  const { files, usable, add, remove, clear, handleReject } = usePdfFiles({
    single: true,
  });
  const [ranges, setRanges] = useState("");
  const [maxDim, setMaxDim] = useState<number>(1600);
  const [done, setDone] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const controller = useRef<AbortController>(undefined);

  const source = usable[0];
  const total = source?.info?.pageCount ?? 0;

  const selection = useMemo(
    () => parsePageRanges(ranges, total),
    [ranges, total],
  );
  // An empty selection means everything, which is what people expect.
  const pages =
    selection.pages.length > 0
      ? selection.pages
      : Array.from({ length: total }, (_, index) => index + 1);

  const handleRender = async () => {
    if (!source || pages.length === 0) return;
    setIsRendering(true);
    setDone(0);

    controller.current = new AbortController();
    const width = String(total).length;
    const pageName = (page: number) =>
      `${baseName(source.name)}-${String(page).padStart(width, "0")}.png`;

    try {
      const rendered = await renderPages(source.file, pages, {
        maxDim,
        signal: controller.current.signal,
        onPage: (_page, count) => setDone(count),
      });

      const entries = rendered.map(({ blob }, index) => ({
        name: pageName(pages[index]),
        blob,
      }));

      if (entries.length === 1) {
        downloadBlob(entries[0].blob, entries[0].name);
      } else {
        await downloadZip(entries, `${baseName(source.name)}-pages.zip`);
      }
      toast.success(`Rendered ${entries.length} pages`);
    } catch (error) {
      if ((error as Error)?.name === "AbortError") toast("Rendering stopped");
      else toast.error("Could not render those pages");
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="space-y-6">
      <ImageDropzone
        onFiles={add}
        onReject={handleReject}
        accept={PDF_TYPES}
        maxBytes={MAX_PDF_BYTES}
        single
        prompt="Drop a PDF here, or click to browse"
        hint="PDF · up to 200MB · rendered on your device"
      />

      {files.length > 0 && (
        <Card>
          <CardContent className="space-y-5">
            <ListHeader
              title="Document"
              onClear={clear}
            />

            <PdfFileList files={files} onRemove={remove} />

            {source && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs" htmlFor="ranges">
                    Pages
                  </Label>
                  <Input
                    id="ranges"
                    value={ranges}
                    spellCheck={false}
                    placeholder={`Blank for all ${total}, or 1-3, 5, 8-`}
                    onChange={(event) => setRanges(event.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="text-muted-foreground text-xs">
                    Rendering {pages.length} of {total}
                    {selection.pages.length > 0 &&
                      `: ${formatPageRanges(pages)}`}
                  </p>
                </div>

                <OptionGroup
                  label="Resolution"
                  choices={RESOLUTIONS}
                  value={maxDim}
                  onChange={setMaxDim}
                  columns={3}
                  hint={`Longest edge ${
                    RESOLUTIONS.find((entry) => entry.value === maxDim)?.note
                  }. Each page is drawn properly, not screenshotted, so text stays crisp.`}
                />

                {isRendering && pages.length > 1 && (
                  <div className="space-y-1.5">
                    <Progress value={(done / pages.length) * 100} className="h-1" />
                    <p className="text-muted-foreground text-xs tabular-nums">
                      Page {done} of {pages.length}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <DownloadButton
                    onClick={handleRender}
                    busy={isRendering}
                    disabled={pages.length === 0 || isRendering}
                    className="flex-1"
                    label={pages.length === 1
                      ? "Download the page as PNG"
                      : `Download ${pages.length} PNGs as a zip`}
                  />

                  {/* A long export is worth being able to abandon. */}
                  {isRendering && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => controller.current?.abort()}
                    >
                      <X className="size-4" />
                      Stop
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
