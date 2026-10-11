"use client";

import { useEffect } from "react";

import { takeHandedOffFiles } from "@/lib/file-handoff";

/**
 * Opens any file dropped onto the home page search for this tool. Taking the
 * files empties the handoff, so re-running the effect is harmless.
 */
export function useHandedOffFiles(
  onFiles: (files: File[]) => void,
  disabled = false,
) {
  useEffect(() => {
    if (disabled) return;
    const files = takeHandedOffFiles();
    if (files.length > 0) onFiles(files);
  }, [onFiles, disabled]);
}
