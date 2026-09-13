import { describe, expect, it } from "vitest";

import type { RawImage } from "@huggingface/transformers";

import {
  AI_MAX_INPUT_DIM,
  AI_SCALE,
  canUseAi,
  rawImageToRgba,
} from "@/lib/ai-upscale";

function rawImage(
  data: number[],
  width: number,
  height: number,
  channels: number,
): RawImage {
  return { data: new Uint8Array(data), width, height, channels } as RawImage;
}

describe("canUseAi", () => {
  it("accepts images within the model's limit", () => {
    expect(canUseAi(640, 480)).toBe(true);
    expect(canUseAi(AI_MAX_INPUT_DIM, AI_MAX_INPUT_DIM)).toBe(true);
  });

  it("rejects anything with a longer edge than the limit", () => {
    expect(canUseAi(AI_MAX_INPUT_DIM + 1, 10)).toBe(false);
    expect(canUseAi(10, AI_MAX_INPUT_DIM + 1)).toBe(false);
  });
});

describe("rawImageToRgba", () => {
  it("weaves an opaque alpha channel into three-channel output", () => {
    const image = rawImage([10, 20, 30, 40, 50, 60], 2, 1, 3);
    expect(Array.from(rawImageToRgba(image))).toEqual([
      10, 20, 30, 255, 40, 50, 60, 255,
    ]);
  });

  it("keeps a real alpha channel when the model provides one", () => {
    const image = rawImage([10, 20, 30, 128], 1, 1, 4);
    expect(Array.from(rawImageToRgba(image))).toEqual([10, 20, 30, 128]);
  });

  it("expands single-channel greyscale across RGB", () => {
    const image = rawImage([90, 200], 2, 1, 1);
    expect(Array.from(rawImageToRgba(image))).toEqual([
      90, 90, 90, 255, 200, 200, 200, 255,
    ]);
  });
});

describe("AI_SCALE", () => {
  it("matches the checkpoint's fixed 2x factor", () => {
    expect(AI_SCALE).toBe(2);
  });
});
