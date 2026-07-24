declare module "imagetracerjs" {
  export interface TracePaletteColor {
    r: number;
    g: number;
    b: number;
    a: number;
  }

  export interface TraceOptions {
    // Tracing
    corsenabled?: boolean;
    ltres?: number;
    qtres?: number;
    pathomit?: number;
    rightangleenhance?: boolean;
    // Colour quantisation
    colorsampling?: 0 | 1 | 2;
    numberofcolors?: number;
    mincolorratio?: number;
    colorquantcycles?: number;
    /** Custom fixed palette. */
    pal?: TracePaletteColor[];
    // Layering
    layering?: 0 | 1;
    // SVG rendering
    strokewidth?: number;
    linefilter?: boolean;
    scale?: number;
    roundcoords?: number;
    viewbox?: boolean;
    desc?: boolean;
    lcpr?: number;
    qcpr?: number;
    // Blur preprocessing
    blurradius?: number;
    blurdelta?: number;
  }

  export interface TraceImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray | number[];
  }

  interface ImageTracer {
    versionnumber: string;
    imagedataToSVG(imgd: TraceImageData, options?: TraceOptions | string): string;
  }

  const tracer: ImageTracer;
  export default tracer;
}
