"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { usePdfFiles } from "@/hooks/use-pdf-files";
import { mergePdfs } from "@/lib/pdf-edit";
import { downloadBlob } from "@/lib/download";
import {
  MAX_PDF_BYTES,
  PDF_TYPES,
} from "@/components/shared/image-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ImageDropzone } from "@/components/shared/image-dropzone";
import { PdfFileList } from "@/components/shared/pdf-file-list";

export function PdfMergeTool() {
  const { files, usable, totalPages, add, remove, clear, move, handleReject } =
    usePdfFiles();
  const unreadable = files.filter((entry) => entry.error).length;
  const [isMerging, setIsMerging] = useState(false);

  const handleMerge = async () => {
    if (usable.length < 2) return;
    setIsMerging(true);
    try {
      const merged = await mergePdfs(usable.map((entry) => entry.file));
      downloadBlob(merged, "merged.pdf");
      toast.success(`Merged ${usable.length} files into ${totalPages} pages`);
    } catch {
      toast.error("Could not merge those files");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="space-y-6">
      <ImageDropzone
        onFiles={add}
        onReject={handleReject}
        accept={PDF_TYPES}
        maxBytes={MAX_PDF_BYTES}
        prompt="Drop PDFs here, or click to browse"
        hint="PDF · up to 200MB each · merged in the order below"
      />

      {files.length > 0 && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">
                Order
                <span className="text-muted-foreground ml-1.5 font-normal">
                  ({files.length})
                </span>
              </h2>
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

            <PdfFileList files={files} onRemove={remove} onMove={move} />

            {usable.length > 0 && (
              <p className="text-muted-foreground text-xs">
                {totalPages} pages in total. Pages are copied across as they
                are, so text stays selectable and nothing is re-compressed.
              </p>
            )}

            <Button
              type="button"
              onClick={handleMerge}
              disabled={usable.length < 2 || isMerging}
              className="w-full"
            >
              {isMerging ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {usable.length >= 2
                ? `Merge ${usable.length} files`
                : unreadable > 0
                  ? // Saying "add two" when they added two is just confusing.
                    `${unreadable} of these cannot be read, add another`
                  : "Add at least two PDFs"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
