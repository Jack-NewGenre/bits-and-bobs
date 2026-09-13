"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { readPdf, type PdfInfo } from "@/lib/pdf";
import type { RejectedFile } from "@/components/shared/image-dropzone";

export interface PdfFile {
  id: string;
  file: File;
  name: string;
  info?: PdfInfo;
  error?: string;
}

export interface UsePdfFilesOptions {
  /**
   * Tools that work on one document at a time. Dropping another replaces the
   * one already there, rather than quietly keeping a file the UI never shows.
   */
  single?: boolean;
}

/**
 * A list of PDFs the user has dropped, each read for its page count as it
 * arrives. Order is meaningful (it is the order a merge will use), so the
 * list can be reordered.
 */
export function usePdfFiles({ single = false }: UsePdfFilesOptions = {}) {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const idRef = useRef(0);

  const update = useCallback((id: string, patch: Partial<PdfFile>) => {
    setFiles((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  }, []);

  const add = useCallback(
    (incoming: File[]) => {
      // A single-document tool takes the last file dropped, so dropping two
      // at once is unambiguous rather than silently dropping one.
      const batch = single ? incoming.slice(-1) : incoming;

      const added = batch.map((file) => {
        idRef.current += 1;
        return {
          id: `pdf-${idRef.current}`,
          file,
          name: file.name,
        };
      });

      setFiles((prev) => (single ? added : [...prev, ...added]));

      added.forEach((entry) => {
        void readPdf(entry.file)
          .then((info) => {
            update(
              entry.id,
              info.encrypted
                ? { error: "Password-protected, so it cannot be read." }
                : { info },
            );
          })
          .catch((failure: unknown) =>
            update(entry.id, {
              error:
                failure instanceof Error ? failure.message : "Could not read it.",
            }),
          );
      });
    },
    [update, single],
  );

  const remove = useCallback((id: string) => {
    setFiles((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const clear = useCallback(() => setFiles([]), []);

  /** Move a file up or down, which is what decides merge order. */
  const move = useCallback((id: string, direction: -1 | 1) => {
    setFiles((prev) => {
      const index = prev.findIndex((entry) => entry.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;

      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const handleReject = useCallback((rejected: RejectedFile[]) => {
    toast.error(
      rejected.length === 1
        ? `${rejected[0].name}: ${rejected[0].reason}`
        : `${rejected.length} files skipped`,
    );
  }, []);

  // Only files that were read successfully can be worked with.
  const usable = files.filter((entry) => entry.info !== undefined);
  const totalPages = usable.reduce(
    (sum, entry) => sum + (entry.info?.pageCount ?? 0),
    0,
  );

  return {
    files,
    usable,
    totalPages,
    add,
    remove,
    clear,
    move,
    handleReject,
  };
}

/** Swap a filename's extension for `.pdf`. */
export function toPdfName(name: string): string {
  return `${name.replace(/\.[^.]+$/, "")}.pdf`;
}

/** Strip the extension, for naming split parts. */
export function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

export type UsePdfFiles = ReturnType<typeof usePdfFiles>;
