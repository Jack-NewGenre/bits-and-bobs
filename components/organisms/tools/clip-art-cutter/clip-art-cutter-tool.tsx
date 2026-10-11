"use client";

import { useMemo, useState } from "react";
import { ImageUp } from "lucide-react";
import { toast } from "sonner";

import { useCutRegions } from "@/hooks/use-cut-regions";
import { useFaviconSource } from "@/hooks/use-favicon-source";
import type { Backdrop } from "@/lib/image/backdrop";
import {
  cutoutBlob,
  cutoutEntries,
  cutoutName,
  findPiecesInImage,
} from "@/lib/image/cutout";
import {
  DEFAULT_DETECT_SETTINGS,
  type DetectSettings,
} from "@/lib/image/detect-pieces";
import type { FaviconSource } from "@/lib/image/favicon";
import { IMAGE_AND_SVG_TYPES, rejectionMessage } from "@/lib/image/file-intake";
import { downloadBlob, withSuffix } from "@/lib/download";
import { downloadZip } from "@/lib/zip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DownloadButton } from "@/components/atoms/download-button";
import { ResultError } from "@/components/atoms/result-error";
import { ImageDropzone } from "@/components/molecules/image-dropzone";
import { ResultPanelShell } from "@/components/organisms/result-panel-shell";
import { CutEditor } from "@/components/organisms/tools/clip-art-cutter/cut-editor";
import { CutOptions } from "@/components/organisms/tools/clip-art-cutter/cut-options";
import { CutoutPreview } from "@/components/organisms/tools/clip-art-cutter/cutout-preview";

const pieceCount = (count: number) =>
  `${count} ${count === 1 ? "piece" : "pieces"}`;

export function ClipArtCutterTool() {
  const [file, setFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<DetectSettings>(
    DEFAULT_DETECT_SETTINGS,
  );
  const [backdrop, setBackdrop] = useState<Backdrop>();
  const [removeBackdrop, setRemoveBackdrop] = useState(true);
  const [detectedFor, setDetectedFor] = useState<FaviconSource>();
  const [saving, setSaving] = useState(false);

  const { source, error } = useFaviconSource(file);
  const cuts = useCutRegions();

  const detect = (image: FaviconSource) => {
    try {
      const found = findPiecesInImage(image.image, image, settings);
      setBackdrop(found.backdrop);
      cuts.replace(found.pieces);
      return found.pieces.length;
    } catch {
      toast.error(
        "Could not look for pieces in this image. Draw boxes by hand instead.",
      );
      return 0;
    }
  };

  // Find the pieces once per image as soon as it decodes, so the first view is useful.
  if (source && source !== detectedFor) {
    setDetectedFor(source);
    detect(source);
  }

  const removal = useMemo(
    () =>
      removeBackdrop && backdrop
        ? { backdrop, tolerance: settings.tolerance }
        : undefined,
    [removeBackdrop, backdrop, settings.tolerance],
  );

  const load = ([next]: File[]) => {
    setBackdrop(undefined);
    setDetectedFor(undefined);
    cuts.replace([]);
    setFile(next ?? null);
  };

  const redetect = () => {
    if (!source) return;
    toast.success(`Found ${pieceCount(detect(source))}.`);
  };

  const downloadOne = async (index: number) => {
    if (!source || !file) return;
    try {
      downloadBlob(
        await cutoutBlob(source.image, cuts.regions[index], removal),
        cutoutName(file.name, index),
      );
    } catch {
      toast.error("Could not cut out that piece. Try again.");
    }
  };

  const downloadAll = async () => {
    if (!source || !file) return;
    setSaving(true);
    try {
      const entries = await cutoutEntries(
        source.image,
        cuts.regions,
        file.name,
        removal,
      );
      await downloadZip(entries, withSuffix(file.name, "-pieces", "zip"));
    } catch {
      toast.error("Could not build the download. Try again.");
    } finally {
      setSaving(false);
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card>
        <CardContent className="space-y-4">
          {source ? (
            <CutEditor src={source.url} bounds={source} cuts={cuts} />
          ) : (
            !error && (
              <div className="bg-muted aspect-video w-full animate-pulse rounded-lg" />
            )
          )}
          {error && <ResultError message={error} />}
          <CutOptions
            settings={settings}
            onSettingsChange={setSettings}
            onDetect={redetect}
            removeBackdrop={removeBackdrop}
            onRemoveBackdropChange={setRemoveBackdrop}
            canRemoveBackdrop={Boolean(backdrop)}
          />
          <Button variant="outline" className="w-full" onClick={() => load([])}>
            <ImageUp />
            New image
          </Button>
        </CardContent>
      </Card>

      <ResultPanelShell
        title={file.name}
        footer={
          <DownloadButton
            className="w-full"
            label={`Download ${pieceCount(cuts.regions.length)} (.zip)`}
            busy={saving}
            disabled={!source || cuts.regions.length === 0}
            onClick={() => void downloadAll()}
          />
        }
      >
        {source && cuts.regions.length > 0 ? (
          <ul
            aria-label="Pieces"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2"
          >
            {cuts.regions.map((region, index) => (
              <CutoutPreview
                key={region.id}
                image={source.image}
                rect={region}
                number={index + 1}
                removal={removal}
                selected={region.id === cuts.selectedId}
                onSelect={() => cuts.select(region.id)}
                onDownload={() => void downloadOne(index)}
                onRemove={() => cuts.remove(region.id)}
              />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            {source
              ? "No pieces yet. Draw a box on the image, or adjust the settings and find pieces again."
              : "Pieces will appear here."}
          </p>
        )}
      </ResultPanelShell>
    </div>
  );
}
