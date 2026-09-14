/**
 * The two tracing engines behind the PNG → SVG tool.
 *
 * Palette tracing (imagetracerjs) handles colour and greyscale: it quantises
 * the raster into a small palette and traces each colour into its own paths.
 * Potrace handles black & white, where its curve fitting produces markedly
 * smoother outlines from far fewer nodes than a palette tracer manages.
 */

import {
  buildTraceOptions,
  despeckleToTurdSize,
  round4,
  smoothingToAlphaMax,
  type VectorizeSettings,
} from "@/lib/image/vectorize";

/**
 * Potrace's wasm module only needs starting once. The live preview re-traces on
 * every settings change, so awaiting a fresh init each time would repeat the
 * setup on every pass.
 */
let potracePromise: Promise<typeof import("esm-potrace-wasm")> | undefined;

async function loadPotrace() {
  return (potracePromise ??= import("esm-potrace-wasm").then(async (module) => {
    await module.init();
    return module;
  }));
}

/** Palette tracing for colour and greyscale modes. */
export async function traceImageTracer(
  imageData: ImageData,
  settings: VectorizeSettings,
  scale: number,
): Promise<string> {
  const { default: ImageTracer } = await import("imagetracerjs");
  return ImageTracer.imagedataToSVG(
    imageData,
    buildTraceOptions(settings, scale),
  );
}

/**
 * Bichrome tracing via Potrace, which returns bare path data rather than a
 * document, so the surrounding `<svg>` is assembled here, sized to the
 * original image and scaled back up from the traced resolution.
 */
export async function tracePotrace(
  imageData: ImageData,
  settings: VectorizeSettings,
  scale: number,
): Promise<string> {
  const { potrace } = await loadPotrace();

  const paths = await potrace(imageData, {
    pathonly: true,
    turdsize: despeckleToTurdSize(settings.despeckle),
    alphamax: smoothingToAlphaMax(settings.smoothing),
    opticurve: 1,
    opttolerance: 0.2,
  });

  const width = round4(imageData.width * scale);
  const height = round4(imageData.height * scale);
  // Potrace winds outer contours, holes and islands in opposite directions, so
  // the default nonzero fill rule nests them correctly at any depth. Setting
  // evenodd here would punch islands back out into holes.
  const body = paths
    .map((d) => `<path fill="#000" d="${d.trim().replace(/\s+/g, " ")}"/>`)
    .join("");

  return (
    `<svg viewBox="0 0 ${imageData.width} ${imageData.height}" ` +
    `width="${width}" height="${height}" ` +
    `version="1.1" xmlns="http://www.w3.org/2000/svg">${body}</svg>`
  );
}

