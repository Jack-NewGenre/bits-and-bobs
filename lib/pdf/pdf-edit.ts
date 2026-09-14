/**
 * Rearranging PDFs: merging, extracting pages, and building one from images.
 *
 * All of it goes through pdf-lib, which copies page objects wholesale rather
 * than re-rendering them. Text stays selectable, vectors stay sharp, and
 * embedded images keep their original bytes. Nothing is re-compressed on the
 * way through.
 */

import { loadPdfLib } from "@/lib/pdf/pdf";
import { throwIfAborted } from "@/lib/image/canvas";
import { clamp } from "@/lib/utils";

const PDF_TYPE = "application/pdf";

function toBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as unknown as BlobPart], { type: PDF_TYPE });
}

export interface EditOptions {
  onProgress?: (progress: { fraction: number }) => void;
  signal?: AbortSignal;
}

/** Join several PDFs into one, in the order given. */
export async function mergePdfs(
  files: Blob[],
  { onProgress, signal }: EditOptions = {},
): Promise<Blob> {
  throwIfAborted(signal);
  const { PDFDocument } = await loadPdfLib();
  const merged = await PDFDocument.create();

  for (const [index, file] of files.entries()) {
    throwIfAborted(signal);
    const source = await PDFDocument.load(await file.arrayBuffer());
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
    onProgress?.({ fraction: (index + 1) / files.length });
  }

  return toBlob(await merged.save());
}

/** Build a new PDF from a selection of pages, in the order given. */
export async function extractPages(
  file: Blob,
  pages: number[],
  { signal }: EditOptions = {},
): Promise<Blob> {
  throwIfAborted(signal);
  const { PDFDocument } = await loadPdfLib();
  const source = await PDFDocument.load(await file.arrayBuffer());

  const total = source.getPageCount();
  // pdf-lib counts from zero; everything the user sees counts from one.
  const indices = pages
    .filter((page) => page >= 1 && page <= total)
    .map((page) => page - 1);

  if (indices.length === 0) {
    throw new Error("No pages were selected.");
  }

  const output = await PDFDocument.create();
  const copied = await output.copyPages(source, indices);
  copied.forEach((page) => output.addPage(page));

  return toBlob(await output.save());
}

export interface SplitPart {
  name: string;
  blob: Blob;
  pages: number[];
}

/** Split a document into one file per page. */
export async function splitToPages(
  file: Blob,
  baseName: string,
  { onProgress, signal }: EditOptions = {},
): Promise<SplitPart[]> {
  throwIfAborted(signal);
  const { PDFDocument } = await loadPdfLib();
  const source = await PDFDocument.load(await file.arrayBuffer());
  const total = source.getPageCount();
  const width = String(total).length;

  const parts: SplitPart[] = [];
  for (let page = 1; page <= total; page++) {
    throwIfAborted(signal);
    const output = await PDFDocument.create();
    const [copied] = await output.copyPages(source, [page - 1]);
    output.addPage(copied);

    parts.push({
      name: `${baseName}-${String(page).padStart(width, "0")}.pdf`,
      blob: toBlob(await output.save()),
      pages: [page],
    });
    onProgress?.({ fraction: page / total });
  }

  return parts;
}

/** Standard page sizes, in PDF points (72 to the inch). */
export const PAGE_SIZES = {
  fit: { label: "Fit to image", width: 0, height: 0 },
  a4: { label: "A4", width: 595.28, height: 841.89 },
  letter: { label: "US Letter", width: 612, height: 792 },
} as const;

export type PageSizeId = keyof typeof PAGE_SIZES;
export type Orientation = "portrait" | "landscape";

export interface ImagesToPdfSettings {
  pageSize: PageSizeId;
  orientation: Orientation;
  /** Margin around the image, in points. */
  margin: number;
}

export const DEFAULT_IMAGES_TO_PDF: ImagesToPdfSettings = {
  pageSize: "fit",
  orientation: "portrait",
  margin: 0,
};

export const MAX_MARGIN = 72;

/**
 * Scale an image to fit inside a page, never enlarging it past its own size,
 * and centre it. Returns the box to draw into, in points.
 */
export function fitOnPage(
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
): { x: number; y: number; width: number; height: number } {
  const available = {
    width: Math.max(1, pageWidth - margin * 2),
    height: Math.max(1, pageHeight - margin * 2),
  };
  const scale = Math.min(
    available.width / imageWidth,
    available.height / imageHeight,
  );

  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}

/** Page dimensions for a chosen size and orientation. */
export function pageDimensions(
  settings: ImagesToPdfSettings,
  imageWidth: number,
  imageHeight: number,
): { width: number; height: number } {
  if (settings.pageSize === "fit") {
    const margin = clamp(settings.margin, 0, MAX_MARGIN);
    return {
      width: imageWidth + margin * 2,
      height: imageHeight + margin * 2,
    };
  }

  const { width, height } = PAGE_SIZES[settings.pageSize];
  return settings.orientation === "landscape"
    ? { width: height, height: width }
    : { width, height };
}

/** Build a PDF with one image per page. */
export async function imagesToPdf(
  files: File[],
  settings: ImagesToPdfSettings = DEFAULT_IMAGES_TO_PDF,
  { onProgress, signal }: EditOptions = {},
): Promise<Blob> {
  throwIfAborted(signal);
  const { PDFDocument } = await loadPdfLib();
  const document = await PDFDocument.create();
  const margin = clamp(settings.margin, 0, MAX_MARGIN);

  for (const [index, file] of files.entries()) {
    throwIfAborted(signal);
    const bytes = new Uint8Array(await file.arrayBuffer());

    // PDF only carries JPEG and PNG natively; anything else is converted by
    // the caller before it gets here.
    const embedded =
      file.type === "image/jpeg"
        ? await document.embedJpg(bytes)
        : await document.embedPng(bytes);

    const size = pageDimensions(settings, embedded.width, embedded.height);
    const page = document.addPage([size.width, size.height]);
    const box = fitOnPage(
      embedded.width,
      embedded.height,
      size.width,
      size.height,
      margin,
    );

    page.drawImage(embedded, box);
    onProgress?.({ fraction: (index + 1) / files.length });
  }

  if (document.getPageCount() === 0) {
    throw new Error("No images to put in a PDF.");
  }

  return toBlob(await document.save());
}
