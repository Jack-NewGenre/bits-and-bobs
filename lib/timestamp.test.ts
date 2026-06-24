import { describe, expect, it } from "vitest";

import {
  describeTimestamp,
  formatRelative,
  parseDate,
  parseTimestamp,
} from "@/lib/timestamp";

describe("parseTimestamp", () => {
  it("treats 10-digit values as seconds in auto mode", () => {
    expect(parseTimestamp("1700000000")).toEqual({ ms: 1700000000000 });
  });

  it("treats 13-digit values as milliseconds in auto mode", () => {
    expect(parseTimestamp("1700000000000")).toEqual({ ms: 1700000000000 });
  });

  it("honours an explicit unit", () => {
    expect(parseTimestamp("5", "seconds")).toEqual({ ms: 5000 });
    expect(parseTimestamp("5", "milliseconds")).toEqual({ ms: 5 });
  });

  it("rejects non-numeric input", () => {
    expect(parseTimestamp("not-a-number")).toBeNull();
    expect(parseTimestamp("")).toBeNull();
  });
});

describe("parseDate", () => {
  it("parses an ISO string", () => {
    expect(parseDate("2023-11-14T22:13:20.000Z")).toEqual({
      ms: 1700000000000,
    });
  });

  it("returns null for an invalid date", () => {
    expect(parseDate("definitely not a date")).toBeNull();
  });
});

describe("formatRelative", () => {
  const now = 1700000000000;

  it("describes past times", () => {
    expect(formatRelative(now - 3_600_000, now)).toBe("1 hour ago");
  });

  it("describes future times", () => {
    expect(formatRelative(now + 2 * 86_400_000, now)).toBe("in 2 days");
  });
});

describe("describeTimestamp", () => {
  it("expands an epoch value into representations", () => {
    const parts = describeTimestamp(1700000000000, 1700000000000);
    expect(parts.unixSeconds).toBe(1700000000);
    expect(parts.unixMillis).toBe(1700000000000);
    expect(parts.iso).toBe("2023-11-14T22:13:20.000Z");
    expect(parts.relative).toBe("now");
  });
});
