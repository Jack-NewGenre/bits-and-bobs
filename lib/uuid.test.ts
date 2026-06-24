import { describe, expect, it } from "vitest";

import {
  DEFAULT_UUID_OPTIONS,
  formatUuid,
  generateUuid,
  generateUuids,
  MAX_COUNT,
} from "@/lib/uuid";

const V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("generateUuid", () => {
  it("produces a valid v4 UUID", () => {
    expect(generateUuid()).toMatch(V4);
  });

  it("produces unique values", () => {
    const set = new Set(Array.from({ length: 200 }, () => generateUuid()));
    expect(set.size).toBe(200);
  });
});

describe("formatUuid", () => {
  const sample = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

  it("uppercases when requested", () => {
    expect(formatUuid(sample, { ...DEFAULT_UUID_OPTIONS, uppercase: true })).toBe(
      sample.toUpperCase(),
    );
  });

  it("strips hyphens when requested", () => {
    const result = formatUuid(sample, {
      ...DEFAULT_UUID_OPTIONS,
      hyphens: false,
    });
    expect(result).not.toContain("-");
    expect(result).toHaveLength(32);
  });
});

describe("generateUuids", () => {
  it("returns the requested count", () => {
    expect(generateUuids({ ...DEFAULT_UUID_OPTIONS, count: 5 })).toHaveLength(5);
  });

  it("clamps to at least one and at most MAX_COUNT", () => {
    expect(generateUuids({ ...DEFAULT_UUID_OPTIONS, count: 0 })).toHaveLength(1);
    expect(
      generateUuids({ ...DEFAULT_UUID_OPTIONS, count: MAX_COUNT + 50 }),
    ).toHaveLength(MAX_COUNT);
  });
});
