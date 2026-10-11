"use client";

import { useEffect, useState } from "react";

import { loadFaviconSource, type FaviconSource } from "@/lib/image/favicon";

export interface FaviconSourceState {
  source?: FaviconSource;
  error?: string;
}

/** Decode the dropped file once, revoking its preview URL when it changes. */
export function useFaviconSource(file: File | null): FaviconSourceState {
  const [state, setState] = useState<FaviconSourceState>({});

  useEffect(() => {
    queueMicrotask(() => setState({}));
    if (!file) return;

    let cancelled = false;
    let url: string | undefined;

    loadFaviconSource(file)
      .then((source) => {
        if (cancelled) {
          URL.revokeObjectURL(source.url);
          return;
        }
        url = source.url;
        setState({ source });
      })
      .catch((failure: unknown) => {
        if (cancelled) return;
        setState({
          error:
            failure instanceof Error && failure.message.includes(file.name)
              ? failure.message
              : `Could not read ${file.name}. Try another file.`,
        });
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  return state;
}
