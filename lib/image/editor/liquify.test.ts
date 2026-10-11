import { describe, expect, it } from "vitest";

import {
  applyBrush,
  createField,
  isIdentityField,
  renderLiquify,
  type LiquifyBrush,
  type LiquifyMode,
} from "@/lib/image/editor/liquify";

const SIZE = 21;

/** A transparent image with an opaque white square of side `2 * half + 1` at the centre. */
function dotImage(half: number): Uint8ClampedArray {
  const px = new Uint8ClampedArray(SIZE * SIZE * 4);
  const c = Math.floor(SIZE / 2);
  for (let y = c - half; y <= c + half; y++) {
    for (let x = c - half; x <= c + half; x++)
      px.fill(255, (y * SIZE + x) * 4, (y * SIZE + x + 1) * 4);
  }
  return px;
}

/** An opaque image whose red and green channels encode each pixel's position. */
function gradientImage(): Uint8ClampedArray {
  const px = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    px.set([(i % SIZE) * 12, Math.floor(i / SIZE) * 12, 0, 255], i * 4);
  }
  return px;
}

function opaqueCount(px: Uint8ClampedArray): number {
  let n = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] > 127) n++;
  return n;
}

function repeat(
  mode: LiquifyMode,
  brush: LiquifyBrush,
  times: number,
  size = SIZE,
) {
  const field = createField(size, size);
  for (let i = 0; i < times; i++) applyBrush(field, mode, brush);
  return field;
}

const CENTRE = { x: 10.5, y: 10.5, radius: 8, pressure: 1 };

describe("liquify", () => {
  it("starts as the identity and renders the source unchanged", () => {
    const field = createField(SIZE, SIZE);
    const source = gradientImage();
    expect(isIdentityField(field)).toBe(true);
    expect(renderLiquify(source, field)).toEqual(source);
  });

  it("bloat enlarges a centred dot and pucker shrinks it", () => {
    const source = dotImage(2);
    const before = opaqueCount(source);
    const bloated = renderLiquify(source, repeat("bloat", CENTRE, 20));
    const puckered = renderLiquify(source, repeat("pucker", CENTRE, 20));
    expect(opaqueCount(bloated)).toBeGreaterThan(before);
    expect(opaqueCount(puckered)).toBeLessThan(before);
  });

  it("forward warp drags a feature in the direction of the stroke", () => {
    const source = dotImage(1);
    const field = createField(SIZE, SIZE);
    for (let step = 1; step <= 8; step++) {
      applyBrush(field, "forward", {
        ...CENTRE,
        x: 10.5 + step * 0.5,
        dx: 0.5,
        dy: 0,
      });
    }
    const out = renderLiquify(source, field);
    let sum = 0;
    let weight = 0;
    for (let x = 0; x < SIZE; x++) {
      const alpha = out[(10 * SIZE + x) * 4 + 3];
      sum += x * alpha;
      weight += alpha;
    }
    expect(sum / weight).toBeGreaterThan(11.5);
    expect(out[(10 * SIZE + 9) * 4 + 3]).toBeLessThan(255);
  });

  it("twirl keeps the centre and everything outside the radius in place", () => {
    const source = gradientImage();
    const out = renderLiquify(
      source,
      repeat("twirl", { ...CENTRE, radius: 6 }, 10),
    );
    const at = (x: number, y: number) =>
      Array.from(out.subarray((y * SIZE + x) * 4, (y * SIZE + x) * 4 + 4));
    const src = (x: number, y: number) =>
      Array.from(source.subarray((y * SIZE + x) * 4, (y * SIZE + x) * 4 + 4));
    expect(at(10, 10)).toEqual(src(10, 10));
    expect(at(2, 2)).toEqual(src(2, 2));
    expect(at(17, 10)).toEqual(src(17, 10));
    expect(at(13, 10)).not.toEqual(src(13, 10));
  });

  it("twirl turns the other way when not clockwise", () => {
    const cw = repeat("twirl", CENTRE, 1);
    const ccw = repeat("twirl", { ...CENTRE, clockwise: false }, 1);
    const i = (10 * SIZE + 14) * 2 + 1;
    expect(Math.sign(cw.offsets[i])).toBe(-Math.sign(ccw.offsets[i]));
  });

  it("reconstruct at full pressure returns the field to the identity", () => {
    const field = repeat("bloat", CENTRE, 10);
    expect(isIdentityField(field)).toBe(false);
    for (let i = 0; i < 20; i++)
      applyBrush(field, "reconstruct", { ...CENTRE, radius: 16 });
    expect(isIdentityField(field)).toBe(true);
  });

  it("returns the changed rectangle, clamped to the field", () => {
    const field = createField(10, 10);
    expect(
      applyBrush(field, "bloat", { x: 5, y: 5, radius: 2, pressure: 1 }),
    ).toEqual({
      left: 3,
      top: 3,
      width: 4,
      height: 4,
    });
    expect(
      applyBrush(field, "bloat", { x: -1, y: 9, radius: 4, pressure: 1 }),
    ).toEqual({
      left: 0,
      top: 5,
      width: 3,
      height: 5,
    });
  });

  it("returns null when the step cannot change anything", () => {
    const field = createField(10, 10);
    expect(
      applyBrush(field, "bloat", { x: -50, y: -50, radius: 5, pressure: 1 }),
    ).toBeNull();
    expect(
      applyBrush(field, "bloat", { x: 5, y: 5, radius: 5, pressure: 0 }),
    ).toBeNull();
    expect(
      applyBrush(field, "forward", { x: 5, y: 5, radius: 5, pressure: 1 }),
    ).toBeNull();
    expect(isIdentityField(field)).toBe(true);
  });

  it("only writes inside the requested area", () => {
    const source = gradientImage();
    const field = repeat("bloat", CENTRE, 5);
    const out = new Uint8ClampedArray(source.length).fill(7);
    const area = { left: 8, top: 9, width: 4, height: 3 };
    renderLiquify(source, field, out, area);
    const full = renderLiquify(source, field);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const o = (y * SIZE + x) * 4;
        const inside = x >= 8 && x < 12 && y >= 9 && y < 12;
        expect(Array.from(out.subarray(o, o + 4))).toEqual(
          inside ? Array.from(full.subarray(o, o + 4)) : [7, 7, 7, 7],
        );
      }
    }
  });

  it("makes sampled points outside the source transparent", () => {
    const source = new Uint8ClampedArray(SIZE * SIZE * 4).fill(255);
    const field = createField(SIZE, SIZE);
    field.offsets[0] = -5;
    expect(renderLiquify(source, field)[3]).toBe(0);
  });
});
