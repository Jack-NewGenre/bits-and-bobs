import { describe, expect, it } from "vitest";

import {
  cloneMarker,
  cloneOffset,
  NO_CLONE_SOURCE,
} from "@/lib/image/editor/clone";

const picked = { source: { x: 10, y: 20 }, offset: null };
const stroked = { source: { x: 10, y: 20 }, offset: { x: 50, y: 5 } };

describe("cloneOffset", () => {
  it("has nothing to copy before a source is picked", () => {
    expect(cloneOffset({ x: 0, y: 0 }, NO_CLONE_SOURCE, true)).toBeNull();
  });

  it("measures the first stroke from the source", () => {
    expect(cloneOffset({ x: 60, y: 25 }, picked, true)).toEqual({
      x: 50,
      y: 5,
    });
  });

  it("keeps the offset for later strokes when aligned", () => {
    expect(cloneOffset({ x: 300, y: 300 }, stroked, true)).toEqual({
      x: 50,
      y: 5,
    });
  });

  it("restarts every stroke from the source when not aligned", () => {
    expect(cloneOffset({ x: 300, y: 300 }, stroked, false)).toEqual({
      x: 290,
      y: 280,
    });
  });
});

describe("cloneMarker", () => {
  it("is hidden before a source is picked", () => {
    expect(cloneMarker({ x: 0, y: 0 }, NO_CLONE_SOURCE, true)).toBeNull();
  });

  it("sits on the source until an offset applies", () => {
    expect(cloneMarker({ x: 99, y: 99 }, picked, true)).toEqual({
      x: 10,
      y: 20,
    });
    expect(cloneMarker({ x: 99, y: 99 }, stroked, false)).toEqual({
      x: 10,
      y: 20,
    });
  });

  it("follows the pointer by the offset", () => {
    expect(cloneMarker({ x: 100, y: 100 }, stroked, true)).toEqual({
      x: 50,
      y: 95,
    });
  });
});
