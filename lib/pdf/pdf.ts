/**
 * Reading and rendering PDFs, in the browser.
 *
 * Two libraries do different halves of the job, and both are loaded on demand
 * because together they are several megabytes:
 *
 *   - pdf-lib reads and rewrites the file's structure. It is what copies
 *     pages between documents without re-encoding anything, so text stays
 *     selectable and images stay exactly as sharp as they were.
 *   - pdf.js draws a page. Turning a PDF into a picture means actually
 *     laying out its text and vectors, which is a rendering engine's job.
 */

import { canvasToBlob, createCanvas2D, throwIfAborted } from "@/lib/image/canvas";

/** Copied into `public` by `bun run build:worker`. */
const WORKER_URL = "/pdf.worker.min.mjs";

type PdfLib = typeof import("pdf-lib");
type PdfJs = typeof import("pdfjs-dist");

let pdfLibPromise: Promise<PdfLib> | undefined;
let pdfJsPromise: Promise<PdfJs> | undefined;

export function loadPdfLib(): Promise<PdfLib> {
  return (pdfLibPromise ??= import("pdf-lib"));
}

export function loadPdfJs(): Promise<PdfJs> {
  return (pdfJsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    // Rendering happens on its own thread; without this it would block the
    // page while laying out every glyph.
    pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;
    return pdfjs;
  }));
}

export interface PdfInfo {
  pageCount: number;
  /** Width and height of the first page, in PDF points. */
  width: number;
  height: number;
  title?: string;
  /** True when the file is password-protected and cannot be read. */
  encrypted: boolean;
}

function isEncrypted(error: unknown): boolean {
  return (
    error instanceof Error && /encrypt|password/i.test(error.message)
  );
}

/** Read a PDF's basic facts without rendering anything. */
export async function readPdf(file: Blob): Promise<PdfInfo> {
  const { PDFDocument } = await loadPdfLib();
  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    const document = await PDFDocument.load(bytes, { updateMetadata: false });
    const [first] = document.getPages();
    return {
      pageCount: document.getPageCount(),
      width: first?.getWidth() ?? 0,
      height: first?.getHeight() ?? 0,
      title: document.getTitle() || undefined,
      encrypted: false,
    };
  } catch (error) {
    if (isEncrypted(error)) {
      return { pageCount: 0, width: 0, height: 0, encrypted: true };
    }
    throw new Error("That file could not be read as a PDF.");
  }
}

export interface RenderOptions {
  /** Longest edge of the rendered image, in pixels. */
  maxDim?: number;
  signal?: AbortSignal;
}

export interface RenderedPage {
  blob: Blob;
  width: number;
  height: number;
}

type LoadedDocument = Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>;

/** Draw one already-open page to a PNG at the requested longest edge. */
async function drawPage(
  document: LoadedDocument,
  pageNumber: number,
  maxDim: number,
): Promise<RenderedPage> {
  const page = await document.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({
    scale: maxDim / Math.max(base.width, base.height),
  });

  const { canvas, ctx } = createCanvas2D(
    Math.round(viewport.width),
    Math.round(viewport.height),
  );
  // A PDF page is transparent where nothing is drawn; paper is not.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvas: canvas as HTMLCanvasElement,
    canvasContext: ctx as CanvasRenderingContext2D,
    viewport,
  }).promise;

  return {
    blob: await canvasToBlob(canvas, "image/png"),
    width: canvas.width,
    height: canvas.height,
  };
}

export interface RenderPagesOptions extends RenderOptions {
  /** Called as each page finishes, so a long job can report progress. */
  onPage?: (page: number, done: number, total: number) => void;
}

/**
 * Render several pages, opening the document once.
 *
 * Opening is the expensive part (the file is handed to the worker and its
 * cross-reference table parsed) so doing it per page would repeat that work
 * for every page of the export. Checking the signal between pages is also
 * what makes a long job stoppable: page rendering itself cannot be
 * interrupted, but the loop around it can.
 *
 * Throws `DOMException` (name "AbortError") if cancelled.
 */
export async function renderPages(
  file: Blob,
  pages: number[],
  { maxDim = 1200, signal, onPage }: RenderPagesOptions = {},
): Promise<RenderedPage[]> {
  throwIfAborted(signal);

  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({ data });
  const document = await task.promise;

  try {
    const rendered: RenderedPage[] = [];
    for (const page of pages) {
      throwIfAborted(signal);
      rendered.push(await drawPage(document, page, maxDim));
      onPage?.(page, rendered.length, pages.length);
    }
    return rendered;
  } finally {
    // Releases the worker's copy of the document, which is otherwise held
    // for as long as the tab lives.
    await task.destroy();
  }
}

/** Draw a single page. A thin wrapper over the batch form. */
export async function renderPage(
  file: Blob,
  pageNumber: number,
  options: RenderOptions = {},
): Promise<RenderedPage> {
  const [page] = await renderPages(file, [pageNumber], options);
  return page;
}
