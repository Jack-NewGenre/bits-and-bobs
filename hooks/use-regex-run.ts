"use client";

import { useEffect, useState } from "react";

import {
  RegexTimeout,
  runRegexSafely,
  type RegexRun,
} from "@/lib/workers/text-worker-client";

const EMPTY: RegexRun = {
  result: { ok: true, matches: [], truncated: false },
};

interface UseRegexRun {
  result: RegexRun["result"];
  /** The replacement output, or undefined when there is nothing to show. */
  replaced?: RegexRun["replaced"];
  /** The pattern was killed for running too long. */
  timedOut: boolean;
}

/**
 * Run a pattern against some text, in the worker, under a deadline.
 *
 * Matching and replacing both happen off the main thread so a runaway
 * pattern is killed rather than freezing the page. Doing the replacement
 * here would put the same backtracking straight back where nothing can stop
 * it. The state is always set from a promise, never synchronously.
 */
export function useRegexRun(
  pattern: string,
  flagString: string,
  input: string,
  replacement: string,
): UseRegexRun {
  const [run, setRun] = useState<RegexRun>(EMPTY);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    runRegexSafely(pattern, flagString, input, {
      replacement: replacement === "" ? undefined : replacement,
    })
      .then((next) => {
        if (cancelled) return;
        setRun(next);
        setTimedOut(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setTimedOut(error instanceof RegexTimeout);
      });

    return () => {
      cancelled = true;
    };
  }, [pattern, flagString, input, replacement]);

  return {
    result: run.result,
    replaced: timedOut ? undefined : run.replaced,
    timedOut,
  };
}
