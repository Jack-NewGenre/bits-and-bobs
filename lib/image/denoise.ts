/**
 * Edge-preserving denoise for RGBA pixel data.
 *
 * A blur removes noise by smearing every pixel into its neighbours, which
 * also destroys the edges a later sharpen pass is trying to recover. The two
 * partly cancel out. A median filter instead replaces each pixel with the
 * middle value of its 3x3 neighbourhood: a lone speck is outvoted and
 * vanishes, while an edge (where most neighbours agree) is left alone.
 *
 * The result is blended back towards the original by `strength`, so the
 * slider fades smoothly from "off" to "full median".
 */

/**
 * Median of nine values via a fixed 19-comparison sorting network. Only the
 * middle element is needed, so this is far cheaper than sorting the window.
 *
 * The nine values are passed as arguments rather than in an array: this runs
 * three times per pixel, so anything allocated per call (an array, or a
 * `swap` closure over one) costs tens of millions of allocations on a large
 * photo. With plain locals the whole network stays in registers.
 */
function medianOfNine(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
): number {
  let t = 0;
  if (b > c) { t = b; b = c; c = t; }
  if (e > f) { t = e; e = f; f = t; }
  if (h > i) { t = h; h = i; i = t; }
  if (a > b) { t = a; a = b; b = t; }
  if (d > e) { t = d; d = e; e = t; }
  if (g > h) { t = g; g = h; h = t; }
  if (b > c) { t = b; b = c; c = t; }
  if (e > f) { t = e; e = f; f = t; }
  if (h > i) { t = h; h = i; i = t; }
  if (a > d) { t = a; a = d; d = t; }
  if (f > i) { t = f; f = i; i = t; }
  if (e > h) { t = e; e = h; h = t; }
  if (d > g) { t = d; d = g; g = t; }
  if (b > e) { t = b; b = e; e = t; }
  if (c > f) { t = c; c = f; f = t; }
  if (e > h) { t = e; e = h; h = t; }
  if (e > c) { t = e; e = c; c = t; }
  if (g > e) { t = g; g = e; e = t; }
  if (e > c) { t = e; e = c; c = t; }
  return e;
}

/**
 * Apply a 3x3 median filter to the RGB channels, blended by `strength` (0–1).
 * Alpha is left untouched so cutouts keep their exact edges. The input is not
 * modified.
 *
 * Pass `into` to write the result somewhere the caller already owns, such as
 * the buffer about to go back onto the canvas. It must start as a copy of
 * `data`, since the untouched border pixels are taken from it as they stand.
 * Without it the result has to be copied across afterwards, which at full
 * resolution means moving the whole image twice.
 */
export function medianDenoise(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number,
  into?: Uint8ClampedArray,
): Uint8ClampedArray {
  const out = into ?? new Uint8ClampedArray(data);
  if (strength <= 0 || width < 3 || height < 3) return out;

  // The neighbourhood is the same shape everywhere, so its byte offsets are a
  // fixed step from the centre rather than nine multiplications per channel.
  const stride = width * 4;

  // Border pixels have no full neighbourhood, so they are left as-is.
  for (let y = 1; y < height - 1; y++) {
    const rowStart = y * stride;
    for (let x = 1; x < width - 1; x++) {
      const centre = rowStart + x * 4;

      for (let channel = 0; channel < 3; channel++) {
        const at = centre + channel;
        const original = data[at];
        const median = medianOfNine(
          data[at - stride - 4], data[at - stride], data[at - stride + 4],
          data[at - 4],          original,          data[at + 4],
          data[at + stride - 4], data[at + stride], data[at + stride + 4],
        );
        out[at] = original + (median - original) * strength;
      }
    }
  }

  return out;
}
