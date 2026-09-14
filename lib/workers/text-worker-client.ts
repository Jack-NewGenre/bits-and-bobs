"use client";

/**
 * Client for the text worker, with a deadline.
 *
 * The worker exists so a runaway pattern can be killed. When one overruns,
 * the worker is terminated outright (a hung thread cannot answer a polite
 * cancel message) and the next call starts a fresh one.
 */

import {
  replaceAll,
  runRegex,
  type RegexResult,
  type ReplaceResult,
} from "@/lib/text/regex";
import type { TextWorkerResponse } from "@/lib/workers/text-worker";

/** Built by `bun run build:worker`; see `image-worker-client` for why. */
const WORKER_URL = "/text-worker.js";

/** How long a single pattern may run before it is assumed runaway. */
export const REGEX_TIMEOUT_MS = 1000;

export interface RegexRun {
  result: RegexResult;
  /** Present only when a replacement template was supplied. */
  replaced?: ReplaceResult;
}

export class RegexTimeout extends Error {
  constructor() {
    super(
      "This pattern took too long to run. Nested quantifiers such as (a+)+ can backtrack exponentially.",
    );
    this.name = "RegexTimeout";
  }
}

interface Pending {
  resolve: (run: RegexRun) => void;
  reject: (error: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

let worker: Worker | null = null;
let unavailable = false;
const pending = new Map<number, Pending>();
let nextId = 0;

/** Destroy the worker; the next call will start a clean one. */
function reset(reason: Error): void {
  worker?.terminate();
  worker = null;
  pending.forEach((entry) => {
    clearTimeout(entry.timer);
    entry.reject(reason);
  });
  pending.clear();
}

function getWorker(): Worker | null {
  if (unavailable) return null;
  if (worker) return worker;

  try {
    worker = new Worker(WORKER_URL, { type: "module" });
  } catch {
    unavailable = true;
    return null;
  }

  worker.addEventListener("message", (event: MessageEvent<TextWorkerResponse>) => {
    const message = event.data;
    if (message.type !== "result") return;
    const entry = pending.get(message.id);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.delete(message.id);
    entry.resolve({ result: message.result, replaced: message.replaced });
  });

  worker.addEventListener("error", () => {
    unavailable = true;
    reset(new Error("The text worker stopped unexpectedly"));
  });

  return worker;
}

/** Both passes run inline, restoring the hang risk the worker exists to avoid. */
function runInline(
  pattern: string,
  flags: string,
  input: string,
  replacement?: string,
): RegexRun {
  return {
    result: runRegex(pattern, flags, input),
    replaced:
      replacement === undefined
        ? undefined
        : replaceAll(pattern, flags, input, replacement),
  };
}

/**
 * Run a pattern with a deadline, optionally applying a replacement template in
 * the same pass. Rejects with `RegexTimeout` if it overruns.
 *
 * Falls back to running inline where a worker is unavailable, which restores
 * the hang risk, but a tool that does not run at all is worse.
 */
export function runRegexSafely(
  pattern: string,
  flags: string,
  input: string,
  { replacement, timeoutMs = REGEX_TIMEOUT_MS }: {
    replacement?: string;
    timeoutMs?: number;
  } = {},
): Promise<RegexRun> {
  const active = getWorker();
  if (!active) {
    return Promise.resolve(runInline(pattern, flags, input, replacement));
  }

  const id = (nextId += 1);

  return new Promise<RegexRun>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reset(new RegexTimeout());
      reject(new RegexTimeout());
    }, timeoutMs);

    pending.set(id, { resolve, reject, timer });
    active.postMessage({ id, pattern, flags, input, replacement });
  });
}
