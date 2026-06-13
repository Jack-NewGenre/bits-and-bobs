/**
 * Unsharp masking for RGBA pixel data.
 *
 * `sharpened = base + amount * (base - blurred)` applied to every channel,
 * including alpha — so the edges of transparent line-art (which are defined by
 * the alpha channel) crisp up too, not just opaque photos. The blurred input is
 * produced by the caller (typically via a canvas `blur()` filter) at a radius
 * proportional to the upscale factor, which is what makes the effect visible
 * after the image has been enlarged.
 *
 * Uint8ClampedArray clamps each result to 0–255 automatically.
 */
export function unsharpMask(
  base: Uint8ClampedArray,
  blurred: Uint8ClampedArray,
  amount: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(base.length);
  for (let i = 0; i < base.length; i++) {
    out[i] = base[i] + amount * (base[i] - blurred[i]);
  }
  return out;
}
