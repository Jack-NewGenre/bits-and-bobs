"use client";

import { useEffect, useState } from "react";

import type { QueueOutput } from "@/hooks/use-image-queue";

export interface LiveResult<TResult extends QueueOutput> {
  /** The latest processed output, if any. */
  result?: TResult;
  /** Object URL for previewing the result blob. */
  url?: string;
  isProcessing: boolean;
  /**
   * True while showing a fast, lower-resolution stand-in. Its blob is not the
   * final artefact, so it must not be offered for download or measured.
   */
  isPreview: boolean;
  /**
   * Why the latest pass failed. While this is set there is no result, so the
   * queue's earlier output is never quietly offered in place of the settings
   * the user can see.
   */
  error?: string;
}

/**
 * The queue's first pass, reused when the current settings still match the
 * ones that produced it. Without this every image would be processed twice:
 * once by the queue and again by the result panel on mount.
 */
export interface LiveResultSeed<TResult extends QueueOutput> {
  result?: TResult;
  /** Object URL owned by the queue, so this hook must never revoke it. */
  url?: string;
  /** Whether the seed still reflects the current settings. */
  matches: boolean;
}

export interface UseLiveResultOptions<TSource, TSettings, TResult extends QueueOutput> {
  source: TSource | undefined;
  /**
   * Must be referentially stable between renders (state or a module constant);
   * a fresh object each render would restart the pass every time.
   */
  settings: TSettings;
  process: (
    source: TSource,
    settings: TSettings,
    options: { signal: AbortSignal },
  ) => Promise<TResult>;
  /**
   * Optional cheap pass rendered first so the user sees the effect of a change
   * almost immediately, while the full-quality pass finishes behind it.
   */
  previewProcess?: (
    source: TSource,
    settings: TSettings,
    options: { signal: AbortSignal },
  ) => Promise<TResult>;
  seed?: LiveResultSeed<TResult>;
  /** Debounce so dragging a slider doesn't spawn a pass on every tick. */
  debounceMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 200;

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function toMessage(error: unknown): string {
  return error instanceof Error && error.message !== ""
    ? error.message
    : "Processing failed.";
}

/**
 * Re-runs `process` whenever the source or settings change, debouncing the
 * work, cancelling any in-flight pass, and owning the lifecycle of the object
 * URLs it creates. Returns the seeded result immediately when the settings
 * still match the queue's first pass.
 */
export function useLiveResult<TSource, TSettings, TResult extends QueueOutput>({
  source,
  settings,
  process,
  previewProcess,
  seed,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseLiveResultOptions<TSource, TSettings, TResult>): LiveResult<TResult> {
  const [live, setLive] = useState<LiveResult<TResult>>({
    isProcessing: false,
    isPreview: false,
  });

  const seeded = seed?.matches ? seed : undefined;
  const skip = source === undefined || seeded !== undefined;

  useEffect(() => {
    if (skip) {
      // Defer the reset to avoid a synchronous cascading render.
      queueMicrotask(() => setLive({ isProcessing: false, isPreview: false }));
      return;
    }

    let cancelled = false;
    const createdUrls: string[] = [];
    const controller = new AbortController();

    const publish = (result: TResult, isPreview: boolean) => {
      const url = URL.createObjectURL(result.blob);
      createdUrls.push(url);
      setLive({ result, url, isProcessing: isPreview, isPreview });
    };

    const timer = setTimeout(() => {
      setLive((prev) =>
        prev.isProcessing ? prev : { ...prev, isProcessing: true },
      );

      const options = { signal: controller.signal };
      const first = previewProcess
        ? previewProcess(source, settings, options).then((preview) => {
            if (!cancelled) publish(preview, true);
          })
        : Promise.resolve();

      first
        .then(() => process(source, settings, options))
        .then((result) => {
          if (cancelled) return;
          publish(result, false);
        })
        .catch((error: unknown) => {
          if (cancelled || isAbortError(error)) return;
          setLive({
            isProcessing: false,
            isPreview: false,
            error: toMessage(error),
          });
        });
    }, debounceMs);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [skip, source, settings, process, previewProcess, debounceMs]);

  if (seeded) {
    return {
      result: seeded.result,
      url: seeded.url,
      isProcessing: false,
      isPreview: false,
    };
  }
  // Before the first live pass lands, keep showing the queue's result rather
  // than blanking the preview and its stats. Once a pass has failed the seed
  // is withheld: it was produced with the default settings, so offering it
  // here would hand back an artefact that does not match the controls on
  // screen, and with nothing on screen to say so.
  if (!live.result && !live.error && seed?.result) {
    return {
      result: seed.result,
      url: seed.url,
      isProcessing: live.isProcessing,
      isPreview: false,
    };
  }
  return live;
}
