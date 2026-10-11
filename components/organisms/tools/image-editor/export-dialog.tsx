"use client";

import { Download } from "lucide-react";

import type { ExportFormat, ExportOptions } from "@/lib/image/editor/canvas-io";
import type { EditorDocument } from "@/lib/image/editor/document";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SliderRow } from "@/components/atoms/slider-row";
import { OptionGroup } from "@/components/molecules/option-group";

const FORMATS = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPG" },
  { value: "webp", label: "WebP" },
] as const satisfies readonly { value: ExportFormat; label: string }[];

const SCALES = [
  { value: 0.5, label: "0.5×" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
  { value: 3, label: "3×" },
] as const;

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: EditorDocument;
  options: ExportOptions;
  onOptionsChange: (options: ExportOptions) => void;
  onExport: () => void;
}

/** Format, size and quality for the downloaded image. */
export function ExportDialog({
  open,
  onOpenChange,
  doc,
  options,
  onOptionsChange,
  onExport,
}: ExportDialogProps) {
  const set = (patch: Partial<ExportOptions>) =>
    onOptionsChange({ ...options, ...patch });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export image</DialogTitle>
          <DialogDescription>
            Saved straight to your device. Nothing is uploaded.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <OptionGroup
            label="Format"
            choices={FORMATS}
            value={options.format}
            onChange={(format) => set({ format })}
            hint={
              options.format === "jpeg" && doc.background === null
                ? "JPG has no transparency, so transparent areas turn white."
                : undefined
            }
          />
          <OptionGroup
            label="Scale"
            choices={SCALES}
            value={options.scale}
            onChange={(scale) => set({ scale })}
            hint={`${Math.round(doc.width * options.scale)} × ${Math.round(doc.height * options.scale)} px`}
          />
          {options.format !== "png" && (
            <SliderRow
              label="Quality"
              value={Math.round(options.quality * 100)}
              min={10}
              max={100}
              onChange={(quality) => set({ quality: quality / 100 })}
            />
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              onExport();
              onOpenChange(false);
            }}
          >
            <Download />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
