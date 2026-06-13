"use client";

import { useCallback, useRef, useState } from "react";
import { ImageUp } from "lucide-react";

import { cn } from "@/lib/utils";

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB

export interface RejectedFile {
  name: string;
  reason: string;
}

interface ImageDropzoneProps {
  onFiles: (files: File[]) => void;
  onReject?: (rejected: RejectedFile[]) => void;
  disabled?: boolean;
  /** Override the helper text shown beneath the prompt. */
  hint?: string;
}

export function partitionFiles(files: File[]): {
  accepted: File[];
  rejected: RejectedFile[];
} {
  const accepted: File[] = [];
  const rejected: RejectedFile[] = [];

  for (const file of files) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      rejected.push({ name: file.name, reason: "Unsupported file type" });
    } else if (file.size > MAX_FILE_BYTES) {
      rejected.push({ name: file.name, reason: "File is larger than 25MB" });
    } else {
      accepted.push(file);
    }
  }

  return { accepted, rejected };
}

export function ImageDropzone({
  onFiles,
  onReject,
  disabled,
  hint = "PNG, JPG or WebP · up to 25MB · multiple at once",
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const { accepted, rejected } = partitionFiles(Array.from(fileList));
      if (rejected.length > 0) onReject?.(rejected);
      if (accepted.length > 0) onFiles(accepted);
    },
    [onFiles, onReject],
  );

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
        if (!disabled) handleFiles(event.dataTransfer.files);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors outline-none",
        "focus-visible:ring-ring focus-visible:ring-2",
        isDragging
          ? "border-primary bg-accent/50"
          : "border-border hover:border-primary/50 hover:bg-accent/30",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <div className="bg-muted text-foreground flex size-12 items-center justify-center rounded-full">
        <ImageUp className="size-6" />
      </div>
      <div>
        <p className="text-sm font-medium">
          Drop images here, or click to browse
        </p>
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        multiple
        hidden
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
