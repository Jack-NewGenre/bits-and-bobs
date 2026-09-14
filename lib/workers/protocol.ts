/** Message contract shared by the image worker and its client. */

import type {
  BackgroundSettings,
} from "@/lib/image/composite";
import type { EnhanceResult, EnhanceSettings } from "@/lib/image/enhance";
import type { TransformResult, TransformSettings } from "@/lib/image/transform";
import type { VectorizeResult, VectorizeSettings } from "@/lib/image/vectorize";

export interface JobResultByKind {
  enhance: EnhanceResult;
  vectorize: VectorizeResult;
  transform: TransformResult;
  composite: { blob: Blob };
}

export type JobKind = keyof JobResultByKind;

export interface JobSettingsByKind {
  enhance: EnhanceSettings;
  vectorize: VectorizeSettings;
  transform: TransformSettings;
  composite: BackgroundSettings;
}

/** Distributed over `JobKind` so `kind` narrows `settings` at the call site. */
export type JobRequest = {
  [K in JobKind]: {
    id: number;
    kind: K;
    source: Blob;
    settings: JobSettingsByKind[K];
    /** Cap on the longest edge, used to render cheap live previews. */
    maxDim?: number;
    /** Enhance only: resample by this factor instead of `settings.scale`. */
    scaleOverride?: number;
  };
}[JobKind];

export interface CancelRequest {
  id: number;
  kind: "cancel";
}

export type WorkerRequest = JobRequest | CancelRequest;

export type WorkerResponse =
  /** Sent once at start-up: `false` means this browser must use the main thread. */
  | { type: "ready"; supported: boolean }
  | { type: "progress"; id: number; fraction: number }
  | { type: "result"; id: number; result: JobResultByKind[JobKind] }
  | { type: "error"; id: number; message: string; aborted: boolean };
