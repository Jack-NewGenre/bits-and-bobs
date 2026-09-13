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
 */
function medianOfNine(w: number[]): number {
  const swap = (a: number, b: number) => {
    if (w[a] > w[b]) {
      const temp = w[a];
      w[a] = w[b];
      w[b] = temp;
    }
  };

  swap(1, 2); swap(4, 5); swap(7, 8);
  swap(0, 1); swap(3, 4); swap(6, 7);
  swap(1, 2); swap(4, 5); swap(7, 8);
  swap(0, 3); swap(5, 8); swap(4, 7);
  swap(3, 6); swap(1, 4); swap(2, 5);
  swap(4, 7); swap(4, 2); swap(6, 4);
  swap(4, 2);

  return w[4];
}

/**
 * Apply a 3x3 median filter to the RGB channels, blended by `strength` (0–1).
 * Alpha is left untouched so cutouts keep their exact edges. Returns a new
 * buffer; the input is not modified.
 */
export function medianDenoise(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data);
  if (strength <= 0 || width < 3 || height < 3) return out;

  const window: number[] = new Array(9);

  // Border pixels have no full neighbourhood, so they are left as-is.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const centre = (y * width + x) * 4;

      for (let channel = 0; channel < 3; channel++) {
        let slot = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const row = (y + dy) * width;
          for (let dx = -1; dx <= 1; dx++) {
            window[slot++] = data[(row + x + dx) * 4 + channel];
          }
        }
        const original = data[centre + channel];
        out[centre + channel] =
          original + (medianOfNine(window) - original) * strength;
      }
    }
  }

  return out;
}
