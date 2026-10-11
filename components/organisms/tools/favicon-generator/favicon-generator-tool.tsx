"use client";

import { useMemo, useState } from "react";
import { ImageUp, Loader2, Scan } from "lucide-react";
import { toast } from "sonner";

import { useFaviconSource } from "@/hooks/use-favicon-source";
import { useFavicons } from "@/hooks/use-favicons";
import { downloadBlob } from "@/lib/download";
import type { Rgb } from "@/lib/colour/colour";
import {
  buildIco,
  faviconEntries,
  faviconSnippet,
  ICO_FILENAME,
} from "@/lib/image/favicon";
import { IMAGE_AND_SVG_TYPES, rejectionMessage } from "@/lib/image/file-intake";
import { centreSquare, type SquareCrop } from "@/lib/image/square-crop";
import { downloadZip } from "@/lib/zip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/atoms/copy-button";
import { DownloadButton } from "@/components/atoms/download-button";
import { ResultError } from "@/components/atoms/result-error";
import { ImageDropzone } from "@/components/molecules/image-dropzone";
import { ResultPanelShell } from "@/components/organisms/result-panel-shell";
import { CropEditor } from "@/components/organisms/tools/favicon-generator/crop-editor";
import {
  backgroundColour,
  FaviconOptions,
  type BackgroundChoice,
} from "@/components/organisms/tools/favicon-generator/favicon-options";
import { FaviconPreviews } from "@/components/organisms/tools/favicon-generator/favicon-previews";

const DEFAULT_CUSTOM: Rgb = { r: 37, g: 99, b: 235, a: 1 };

export function FaviconGeneratorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [cropEdit, setCropEdit] = useState<SquareCrop | null>(null);
  const [radius, setRadius] = useState(0);
  const [background, setBackground] = useState<BackgroundChoice>("transparent");
  const [custom, setCustom] = useState(DEFAULT_CUSTOM);
  const [saving, setSaving] = useState<"zip" | "ico" | null>(null);

  const { source, error: sourceError } = useFaviconSource(file);
  const defaultCrop = useMemo(
    () => (source ? centreSquare(source) : null),
    [source],
  );
  const crop = cropEdit ?? defaultCrop;
  const fill = useMemo(
    () => backgroundColour(background, custom),
    [background, custom],
  );
  const settings = useMemo(
    () => (crop ? { crop, radius, background: fill } : undefined),
    [crop, radius, fill],
  );
  const {
    favicons,
    error: renderError,
    isRendering,
  } = useFavicons(source?.image, settings);
  const error = sourceError ?? renderError;
  const ready = favicons.length > 0;

  const load = ([next]: File[]) => {
    setCropEdit(null);
    setFile(next);
  };

  const save = async (kind: "zip" | "ico") => {
    setSaving(kind);
    try {
      if (kind === "zip") {
        await downloadZip(await faviconEntries(favicons), "favicons.zip");
      } else {
        downloadBlob(await buildIco(favicons), ICO_FILENAME);
      }
    } catch {
      toast.error("Could not build the download. Try again.");
    } finally {
      setSaving(null);
    }
  };

  if (!file) {
    return (
      <ImageDropzone
        single
        accept={IMAGE_AND_SVG_TYPES}
        onFiles={load}
        onReject={(rejected) => toast.error(rejectionMessage(rejected))}
        prompt="Drop an image here, paste, or click to browse"
        hint="PNG, JPG, WebP or SVG · it never leaves your device"
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <Card>
        <CardContent className="space-y-4">
          {source && crop ? (
            <CropEditor
              src={source.url}
              bounds={source}
              crop={crop}
              radius={radius}
              background={fill}
              onChange={setCropEdit}
            />
          ) : (
            <div className="bg-muted aspect-square w-full animate-pulse rounded-lg" />
          )}
          <p className="text-muted-foreground text-xs">
            Drag the square to choose the part of the image to use, or drag a
            corner to resize it.
          </p>
          <FaviconOptions
            radius={radius}
            onRadiusChange={setRadius}
            background={background}
            onBackgroundChange={setBackground}
            custom={custom}
            onCustomChange={setCustom}
            disabled={!source}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCropEdit(null)}
              disabled={!cropEdit}
            >
              <Scan />
              Reset crop
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setFile(null)}
            >
              <ImageUp />
              New image
            </Button>
          </div>
        </CardContent>
      </Card>

      <ResultPanelShell
        title={file.name}
        footerClassName="gap-2"
        footer={
          <>
            <DownloadButton
              onClick={() => void save("zip")}
              busy={saving === "zip"}
              disabled={!ready || isRendering || saving !== null}
              label="Download all (.zip)"
              className="flex-1"
            />
            <DownloadButton
              onClick={() => void save("ico")}
              busy={saving === "ico"}
              disabled={!ready || isRendering || saving !== null}
              label={ICO_FILENAME}
              variant="outline"
              className="flex-1"
            />
          </>
        }
      >
        {isRendering && !ready && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Rendering icons…
          </p>
        )}
        {error && <ResultError message={error} />}
        {ready && (
          <>
            <FaviconPreviews favicons={favicons} />
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  HTML for your &lt;head&gt;
                </p>
                <CopyButton value={faviconSnippet} />
              </div>
              <pre className="bg-muted overflow-auto rounded-md p-3 font-mono text-xs">
                {faviconSnippet()}
              </pre>
            </div>
          </>
        )}
      </ResultPanelShell>
    </div>
  );
}
