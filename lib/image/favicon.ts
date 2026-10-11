/** Turning one image into the set of icons a website needs. */

import { canvasToBlob, createCanvas2D, loadImage } from "@/lib/image/canvas";
import { encodeIco } from "@/lib/image/ico";
import type { SquareCrop } from "@/lib/image/square-crop";
import type { Rgb } from "@/lib/colour/colour";
import { formatRgb } from "@/lib/colour/colour-format";

export const FAVICON_SIZES = [16, 32, 48, 64, 128, 180, 192, 512] as const;
export type FaviconSize = (typeof FAVICON_SIZES)[number];

/** The sizes packed into `favicon.ico`: tabs, bookmarks and desktop shortcuts. */
export const ICO_SIZES: readonly FaviconSize[] = [16, 32, 48, 64];

export const ICO_FILENAME = "favicon.ico";

export interface Favicon {
  size: FaviconSize;
  blob: Blob;
}

const ROLES: Partial<Record<FaviconSize, string>> = {
  180: "Apple touch",
  192: "Android",
  512: "PWA",
};

/** Where a size is used, for the row beside its preview. */
export function faviconRole(size: FaviconSize): string {
  return ROLES[size] ?? (ICO_SIZES.includes(size) ? "Browser" : "Desktop");
}

/** iOS looks for `apple-touch-icon.png` by name, so that one keeps it. */
export function faviconFilename(size: FaviconSize): string {
  return size === 180 ? "apple-touch-icon.png" : `favicon-${size}x${size}.png`;
}

/** The `<link>` tags that point a page at the generated files. */
export function faviconSnippet(): string {
  const png = (size: FaviconSize) =>
    `<link rel="icon" type="image/png" sizes="${size}x${size}" href="/${faviconFilename(size)}">`;
  return [
    `<link rel="icon" href="/${ICO_FILENAME}" sizes="any">`,
    png(16),
    png(32),
    `<link rel="apple-touch-icon" sizes="180x180" href="/${faviconFilename(180)}">`,
    png(192),
    png(512),
  ].join("\n");
}

const LARGEST = Math.max(...FAVICON_SIZES);
const PLAIN_LENGTH = /^\s*(\d*\.?\d+)\s*(px)?\s*$/;

function readLength(value: string | null): number | null {
  const match = value?.match(PLAIN_LENGTH);
  const length = match ? Number(match[1]) : 0;
  return length > 0 ? length : null;
}

function readViewBox(
  value: string | null,
): { width: number; height: number } | null {
  const parts =
    value
      ?.trim()
      .split(/[\s,]+/)
      .map(Number) ?? [];
  const [, , width, height] = parts;
  return parts.length === 4 && width > 0 && height > 0
    ? { width, height }
    : null;
}

/**
 * Give an SVG a real pixel size, with its longer side at the largest icon.
 * An SVG with only a viewBox (or a percentage size) has no intrinsic size, so
 * a browser draws it at 300×150 and every icon comes out cropped or blurred.
 * Returns null when the text is not an SVG at all.
 */
export function sizeSvg(text: string): string | null {
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = doc.documentElement;
  if (
    svg.localName !== "svg" ||
    doc.getElementsByTagName("parsererror").length > 0
  ) {
    return null;
  }

  const width = readLength(svg.getAttribute("width"));
  const height = readLength(svg.getAttribute("height"));
  const box =
    readViewBox(svg.getAttribute("viewBox")) ??
    (width && height ? { width, height } : { width: LARGEST, height: LARGEST });

  // Without a viewBox, changing the size crops the drawing instead of scaling it.
  if (!svg.hasAttribute("viewBox")) {
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
  }
  const scale = LARGEST / Math.max(box.width, box.height);
  svg.setAttribute("width", String(box.width * scale));
  svg.setAttribute("height", String(box.height * scale));
  return new XMLSerializer().serializeToString(svg);
}

/** The file as something a browser can draw at a known size. */
export async function drawableBlob(file: File): Promise<Blob> {
  if (file.type !== "image/svg+xml") return file;
  const sized = sizeSvg(await file.text());
  if (sized === null) throw new Error(`${file.name} is not a readable SVG`);
  return new Blob([sized], { type: "image/svg+xml" });
}

export interface FaviconSource {
  image: HTMLImageElement;
  /** Object URL the image was loaded from, for on-screen previews. */
  url: string;
  width: number;
  height: number;
}

/**
 * Decode the file once, so moving the crop redraws from memory rather than
 * reading the file again. The caller owns `url` and revokes it when done.
 */
export async function loadFaviconSource(file: File): Promise<FaviconSource> {
  const url = URL.createObjectURL(await drawableBlob(file));
  try {
    const image = await loadImage(url);
    const { naturalWidth: width, naturalHeight: height } = image;
    if (width === 0 || height === 0)
      throw new Error(`${file.name} has no size to draw`);
    return { image, url, width, height };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/** Corner radius as a percentage of the side: 0 is square, 50 is a circle. */
export const MAX_RADIUS = 50;

export interface FaviconSettings {
  crop: SquareCrop;
  radius: number;
  /** Fill behind the image, inside the rounded corners. Unset is transparent. */
  background?: Rgb;
}

type PaintContext = Pick<
  CanvasRenderingContext2D,
  | "beginPath"
  | "roundRect"
  | "clip"
  | "fillStyle"
  | "fillRect"
  | "imageSmoothingQuality"
  | "drawImage"
>;

/**
 * Draw one icon: clip to the rounded square, fill the background, then the
 * chosen part of the image on top, so transparent areas of a logo show the
 * colour and the corners stay transparent.
 */
export function paintFavicon(
  ctx: PaintContext,
  image: CanvasImageSource,
  { crop: { x, y, side }, radius, background }: FaviconSettings,
  size: number,
): void {
  if (radius > 0) {
    ctx.beginPath();
    ctx.roundRect(
      0,
      0,
      size,
      size,
      (size * Math.min(radius, MAX_RADIUS)) / 100,
    );
    ctx.clip();
  }
  if (background) {
    ctx.fillStyle = formatRgb(background);
    ctx.fillRect(0, 0, size, size);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, x, y, side, side, 0, 0, size, size);
}

/** Draw the chosen square as a PNG at every icon size. */
export function renderFavicons(
  image: CanvasImageSource,
  settings: FaviconSettings,
): Promise<Favicon[]> {
  return Promise.all(
    FAVICON_SIZES.map(async (size) => {
      const { canvas, ctx } = createCanvas2D(size, size);
      paintFavicon(ctx, image, settings, size);
      return { size, blob: await canvasToBlob(canvas, "image/png") };
    }),
  );
}

/** Pack the small sizes into one `favicon.ico`. */
export async function buildIco(favicons: Favicon[]): Promise<Blob> {
  const images = await Promise.all(
    favicons
      .filter(({ size }) => ICO_SIZES.includes(size))
      .map(async ({ size, blob }) => ({
        size,
        png: new Uint8Array(await blob.arrayBuffer()),
      })),
  );
  return new Blob([encodeIco(images)], { type: "image/x-icon" });
}

/** Every file a site needs, named to match the snippet, ready to zip. */
export async function faviconEntries(
  favicons: Favicon[],
): Promise<{ name: string; blob: Blob }[]> {
  return [
    { name: ICO_FILENAME, blob: await buildIco(favicons) },
    ...favicons.map(({ size, blob }) => ({
      name: faviconFilename(size),
      blob,
    })),
  ];
}
