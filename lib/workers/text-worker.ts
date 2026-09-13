/**
 * Runs regular expressions off the main thread.
 *
 * A pattern like `(a+)+b` backtracks exponentially: 26 characters of input
 * takes a fifth of a second, forty takes longer than anyone will wait. That
 * work happens inside a single synchronous `exec`, so it cannot be cancelled
 * or polled. The only way to stop it is to destroy the thread running it.
 * Off the main thread, that is a `terminate()`; on the main thread it would
 * be a permanently frozen tab.
 *
 * Replacing runs the same pattern over the same text, so it is done here too
 * rather than on the main thread, under the same deadline.
 *
 * Deliberately tiny and dependency-free, so it costs almost nothing to load.
 */

import { replaceAll, runRegex, type RegexResult, type ReplaceResult } from "@/lib/regex";

export interface TextWorkerRequest {
  id: number;
  pattern: string;
  flags: string;
  input: string;
  /** Replacement template. Omitted when the tool only needs the matches. */
  replacement?: string;
}

export type TextWorkerResponse =
  | { type: "ready" }
  | {
      type: "result";
      id: number;
      result: RegexResult;
      replaced?: ReplaceResult;
    };

self.addEventListener("message", (event: MessageEvent<TextWorkerRequest>) => {
  const { id, pattern, flags, input, replacement } = event.data;
  const message: TextWorkerResponse = {
    type: "result",
    id,
    result: runRegex(pattern, flags, input),
    replaced:
      replacement === undefined
        ? undefined
        : replaceAll(pattern, flags, input, replacement),
  };
  self.postMessage(message);
});

self.postMessage({ type: "ready" } satisfies TextWorkerResponse);
