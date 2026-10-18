"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { CropMarks } from "@/components/atoms/crop-marks";
import {
  ACCEPTED_TYPES,
  MAX_FILE_BYTES,
  filesFromClipboard,
  partitionFiles,
  type RejectedFile,
} from "@/lib/image/file-intake";
import { useHandedOffFiles } from "@/hooks/use-handed-off-files";

interface ImageDropzoneProps {
  onFiles: (files: File[]) => void;
  onReject?: (rejected: RejectedFile[]) => void;
  disabled?: boolean;
  /** Override the helper text shown beneath the prompt. */
  hint?: string;
  /** MIME types to accept. Defaults to the image formats. */
  accept?: string[];
  /** Override the main prompt, e.g. for a tool that takes PDFs. */
  prompt?: string;
  /** Only take one file at a time. */
  single?: boolean;
  /** Largest file accepted. Defaults to the image limit. */
  maxBytes?: number;
}

export function ImageDropzone({
  onFiles,
  onReject,
  disabled,
  hint = "PNG, JPG or WebP · up to 25MB · multiple at once",
  accept = ACCEPTED_TYPES,
  prompt = "Drop images here, paste, or click to browse",
  single = false,
  maxBytes = MAX_FILE_BYTES,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const { accepted, rejected } = partitionFiles(files, accept, maxBytes);
      if (rejected.length > 0) onReject?.(rejected);
      if (accepted.length > 0) onFiles(accepted);
    },
    [onFiles, onReject, accept, maxBytes],
  );
  useHandedOffFiles(handleFiles, disabled);

  // Paste anywhere on the page: a screenshot goes straight in, with no detour
  // through saving it to disk first.
  useEffect(() => {
    if (disabled) return;

    const onPaste = (event: ClipboardEvent) => {
      // Pasting only makes sense for images; a PDF is not on the clipboard.
      if (!accept.includes("image/png")) return;
      const pasted = filesFromClipboard(event.clipboardData?.items);
      if (pasted.length === 0) return;
      event.preventDefault();
      handleFiles(pasted);
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [disabled, handleFiles, accept]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      aria-label="Upload images"
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (!disabled) handleFiles(Array.from(event.dataTransfer.files));
      }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors outline-none",
        "focus-visible:ring-ring focus-visible:ring-2",
        isDragging
          ? "border-primary bg-accent/50"
          : "border-border hover:border-primary/50 hover:bg-accent/30",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <CropMarks />
      <div className="bg-muted text-foreground flex size-12 items-center justify-center rounded-full">
        <ImageUp className="size-6" />
      </div>
      <div>
        <p className="text-sm font-medium">{prompt}</p>
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(",")}
        multiple={!single}
        hidden
        onChange={(event) => {
          handleFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </div>
  );
}
