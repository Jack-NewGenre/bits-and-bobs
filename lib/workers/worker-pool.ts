/**
 * The pool of image workers, and the plumbing that runs a job on one.
 *
 * Kept apart from the typed job functions because this is all lifecycle: how
 * many workers there are, which one is free, what happens when one dies. The
 * tools never touch any of it.
 */

import type {
  JobKind,
  JobResultByKind,
  JobSettingsByKind,
  WorkerResponse,
} from "@/lib/workers/protocol";

export interface JobOptions {
  onProgress?: (progress: { fraction: number }) => void;
  signal?: AbortSignal;
  /** Cap on the longest edge, used to render cheap live previews. */
  maxDim?: number;
  /** Enhance only: resample by this factor instead of `settings.scale`. */
  scaleOverride?: number;
}

interface Pending {
  resolve: (result: JobResultByKind[JobKind]) => void;
  reject: (error: unknown) => void;
  onProgress?: (progress: { fraction: number }) => void;
  /** Which worker is running this, so a cancel reaches the right one. */
  entry: PoolWorker;
}

interface PoolWorker {
  worker: Worker;
  /** Jobs in flight here, so the next one goes wherever there is room. */
  load: number;
}

/**
 * The worker is bundled separately by `bun run build:worker` into
 * `public/image-worker.js`. Next's bundler copies a `new Worker(new URL(...))`
 * target through verbatim rather than compiling it, so a worker written in
 * TypeScript with project imports would reach the browser unparsed; building
 * it ourselves produces one self-contained module instead.
 */
const WORKER_URL = "/image-worker.js";

/** How long to wait for the worker's readiness handshake before giving up. */
const READY_TIMEOUT_MS = 4000;

/** Ceiling on the pool, whatever the machine claims to have. */
const MAX_WORKERS = 4;

const pending = new Map<number, Pending>();
const pool: PoolWorker[] = [];
let firstWorker: Promise<PoolWorker | null> | undefined;
let nextId = 0;

/**
 * How many images may be processed at once.
 *
 * One core is left for the interface, and there is a ceiling because each job
 * in flight holds several full-size pixel buffers: past a handful, more
 * workers buy memory pressure rather than speed.
 */
export function workerConcurrency(): number {
  if (typeof navigator === "undefined") return 1;
  return Math.max(1, Math.min(MAX_WORKERS, (navigator.hardwareConcurrency ?? 2) - 1));
}

/**
 * Drop a worker that has died, failing only the jobs it was running. If it was
 * the last one, give up on the worker path: posting to a terminated worker is
 * silently dropped, so a job handed one would never settle at all.
 */
function failWorker(entry: PoolWorker, reason: Error): void {
  pending.forEach((job, id) => {
    if (job.entry !== entry) return;
    pending.delete(id);
    job.reject(reason);
  });

  const at = pool.indexOf(entry);
  if (at !== -1) pool.splice(at, 1);
  if (pool.length === 0) firstWorker = Promise.resolve(null);
}

function settleJob(id: number): Pending | undefined {
  const job = pending.get(id);
  if (!job) return undefined;
  pending.delete(id);
  job.entry.load = Math.max(0, job.entry.load - 1);
  return job;
}

function handleMessage(event: MessageEvent<WorkerResponse>): void {
  const message = event.data;
  if (message.type === "ready") return;

  if (message.type === "progress") {
    pending.get(message.id)?.onProgress?.({ fraction: message.fraction });
    return;
  }

  const job = settleJob(message.id);
  if (!job) return;

  if (message.type === "result") {
    job.resolve(message.result);
    return;
  }
  job.reject(
    message.aborted
      ? new DOMException("Aborted", "AbortError")
      : new Error(message.message),
  );
}

/**
 * Start a worker and add it to the pool.
 *
 * Only the first one has to be waited for: its handshake is what says whether
 * this browser can run the pipelines off-thread at all. Once that is known,
 * later workers run the same module, and a message posted before a worker has
 * attached its listener is queued by the browser rather than lost.
 *
 * A worker grown for a waiting caller joins the pool already reserved for it.
 * It is only ever started because there was nothing idle to hand out, and the
 * caller cannot claim it until the `await` here resumes, which is one turn
 * too late: another lane would find it sitting at zero and take it first.
 */
function spawn(awaitReady: boolean): Promise<PoolWorker | null> {
  return new Promise<PoolWorker | null>((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(WORKER_URL, { type: "module" });
    } catch {
      resolve(null);
      return;
    }

    const entry: PoolWorker = { worker, load: 0 };
    let settled = false;

    const settle = (value: PoolWorker | null) => {
      clearTimeout(timer);
      if (value === null) {
        worker.terminate();
      } else if (!pool.includes(value)) {
        pool.push(value);
      }
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = awaitReady
      ? setTimeout(() => settle(null), READY_TIMEOUT_MS)
      : undefined;

    worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
      if (event.data.type === "ready") {
        // A worker that says it cannot cope is no use to anyone, so the whole
        // pool gives up and the pipelines run inline instead.
        settle(event.data.supported ? entry : null);
        return;
      }
      handleMessage(event);
    });

    worker.addEventListener("error", () => {
      failWorker(entry, new Error("Image worker stopped unexpectedly"));
      settle(null);
    });

    if (!awaitReady) settle(reserve(entry));
  });
}

/**
 * Claim a worker for the job that is about to be posted to it.
 *
 * The count has to go up here rather than where the job is posted. A caller
 * reaches `runOnWorker` a microtask after `acquire` resolves at the earliest,
 * and a batch opens all its lanes at once, so every lane would park on the
 * same readiness promise and then, one after another, see the same worker
 * sitting at zero. The whole batch would land on one thread.
 */
function reserve(entry: PoolWorker): PoolWorker {
  entry.load += 1;
  return entry;
}

/**
 * A worker to run the next job on: an idle one if there is one, otherwise a
 * new one while the pool has room, otherwise whichever is least busy. Null
 * means the worker path is unavailable and the caller should run inline.
 *
 * The worker comes back already reserved, so the caller must pass it to
 * `runOnWorker`, which is what releases it again once the job settles.
 */
export async function acquire(): Promise<PoolWorker | null> {
  const first = await (firstWorker ??= spawn(true));
  if (!first) return null;

  const idle = pool.find((entry) => entry.load === 0);
  if (idle) return reserve(idle);

  if (pool.length < workerConcurrency()) {
    // Already reserved by `spawn`, which is what keeps it out of another
    // lane's hands across the await.
    const extra = await spawn(false);
    if (extra) return extra;
  }

  if (pool.length === 0) return null;
  return reserve(
    pool.reduce((least, entry) => (entry.load < least.load ? entry : least)),
  );
}

export function runOnWorker<K extends JobKind>(
  entry: PoolWorker,
  kind: K,
  source: Blob,
  settings: JobSettingsByKind[K],
  { onProgress, signal, maxDim, scaleOverride }: JobOptions,
): Promise<JobResultByKind[K]> {
  const id = (nextId += 1);
  const { worker } = entry;

  return new Promise<JobResultByKind[K]>((resolve, reject) => {
    const onAbort = () => {
      if (!settleJob(id)) return;
      worker.postMessage({ id, kind: "cancel" });
      reject(new DOMException("Aborted", "AbortError"));
    };

    // A job that finishes normally must take its listener with it. The caller's
    // signal can outlive any one job, so leaving them attached would pile up a
    // dead listener per job for the life of the controller.
    const settle = <T>(finish: (value: T) => void) => (value: T) => {
      signal?.removeEventListener("abort", onAbort);
      finish(value);
    };

    pending.set(id, {
      resolve: settle(resolve) as Pending["resolve"],
      reject: settle(reject),
      onProgress,
      entry,
    });

    signal?.addEventListener("abort", onAbort, { once: true });

    worker.postMessage({ id, kind, source, settings, maxDim, scaleOverride });
  });
}
