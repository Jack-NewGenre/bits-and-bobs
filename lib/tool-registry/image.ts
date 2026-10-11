/** Image tools. */

import {
  AppWindow,
  Crop,
  FileImage,
  Layers,
  Palette,
  Scaling,
  Scissors,
  Shapes,
  Shrink,
  Spline,
  Sticker,
  WandSparkles,
} from "lucide-react";

import { ACCEPTED_TYPES, IMAGE_AND_SVG_TYPES } from "@/lib/image/file-intake";
import type { Tool } from "@/lib/types";

export const IMAGE_TOOLS: Tool[] = [
  {
    slug: "image-editor",
    name: "Photo Studio",
    description:
      "Edit images with layers, brushes, text, shapes and adjustments. Private, free, no uploads.",
    blurb:
      "Photo Studio is a layered image editor in your browser: paint, add text and shapes, adjust colours, blend layers and export. Nothing is uploaded. It is completely private and free.",
    category: "image",
    icon: Layers,
    status: "available",
    href: "/tools/image-editor",
    accepts: ACCEPTED_TYPES,
    fullScreen: true,
  },
  {
    slug: "background-removal",
    name: "Background Remover",
    description:
      "Remove image backgrounds locally with AI. Private, free, no uploads.",
    blurb:
      "Upload an image and the background is removed on your device using AI. Nothing is uploaded. It is completely private and free.",
    category: "image",
    icon: Scissors,
    status: "available",
    href: "/tools/background-removal",
    accepts: ACCEPTED_TYPES,
  },
  {
    slug: "image-enhancer",
    name: "Image Enhancer",
    description:
      "Upscale, sharpen and denoise low-quality images locally. Private and free.",
    blurb:
      "Upscale and sharpen low-quality images on your device. Nothing is uploaded. It is completely private and free.",
    category: "image",
    icon: WandSparkles,
    status: "available",
    href: "/tools/image-enhancer",
    accepts: ACCEPTED_TYPES,
  },
  {
    slug: "png-to-svg",
    name: "PNG to SVG",
    description:
      "Trace PNG, JPG or WebP images into scalable SVG vectors. Private, free, no uploads.",
    blurb:
      "Trace PNG, JPG or WebP images into infinitely scalable SVG vectors on your device. Nothing is uploaded. It is completely private and free.",
    category: "image",
    icon: Spline,
    status: "available",
    href: "/tools/png-to-svg",
    accepts: ACCEPTED_TYPES,
  },
  {
    slug: "clip-art-cutter",
    name: "Clip Art Cutter",
    description:
      "Lasso the parts of an image you want and save each as a separate image.",
    blurb:
      "Upload an image and lasso round the parts you want, or let every piece be found for you. Download each one as its own PNG. Nothing is uploaded. It is completely private and free.",
    category: "image",
    icon: Shapes,
    status: "available",
    href: "/tools/clip-art-cutter",
    accepts: IMAGE_AND_SVG_TYPES,
  },
  {
    slug: "sticker-maker",
    name: "Sticker Maker",
    description:
      "Turn any picture into a die-cut sticker with a border and a soft shadow.",
    blurb:
      "Upload an image and its background is removed, then a border is drawn round its outline with a soft shadow beneath. Choose the border's thickness and colour and download a transparent PNG. Nothing is uploaded. It is completely private and free.",
    category: "image",
    icon: Sticker,
    status: "available",
    href: "/tools/sticker-maker",
    accepts: ACCEPTED_TYPES,
  },
  {
    slug: "image-clipper",
    name: "Image Clipper",
    description:
      "Trim the transparent margin off a PNG, cropping it to its content.",
    blurb:
      "Crop the empty space around a transparent PNG down to its content. Nothing is uploaded. It is completely private and free.",
    category: "image",
    icon: Crop,
    status: "available",
    href: "/tools/image-clipper",
    accepts: ACCEPTED_TYPES,
  },
  {
    slug: "image-compressor",
    name: "Image Compressor",
    description:
      "Shrink PNG, JPG and WebP files without noticeable quality loss.",
    blurb:
      "Shrink PNG, JPG and WebP files and see exactly what you saved. Nothing is uploaded.",
    category: "image",
    icon: Shrink,
    status: "available",
    href: "/tools/image-compressor",
    accepts: ACCEPTED_TYPES,
  },
  {
    slug: "image-converter",
    name: "Image Converter",
    description: "Convert between PNG, JPG and WebP.",
    blurb:
      "Convert images between PNG, JPG and WebP in batches. Nothing is uploaded. It runs on your device.",
    category: "image",
    icon: FileImage,
    status: "available",
    href: "/tools/image-converter",
    accepts: ACCEPTED_TYPES,
  },
  {
    slug: "image-resizer",
    name: "Resize & Crop",
    description: "Resize, crop and scale images to exact dimensions.",
    blurb:
      "Resize images to exact dimensions or a percentage, with the aspect ratio locked or free.",
    category: "image",
    icon: Scaling,
    status: "available",
    href: "/tools/image-resizer",
    accepts: ACCEPTED_TYPES,
  },
  {
    slug: "palette-extractor",
    name: "Palette Extractor",
    description: "Pull a colour palette out of any image.",
    blurb:
      "Pull the dominant colours out of any image, ranked by how much of it they cover.",
    category: "image",
    icon: Palette,
    status: "available",
    href: "/tools/palette-extractor",
    accepts: ACCEPTED_TYPES,
  },
  {
    slug: "favicon-generator",
    name: "Favicon Generator",
    description:
      "Turn one image into every favicon size, with an ICO and the HTML.",
    blurb:
      "Drop in a PNG, JPG, WebP or SVG, pick the square to use, how round its corners are and a background colour, and get favicon.ico, the Apple touch icon, the Android and PWA sizes, and the link tags to paste. Nothing is uploaded.",
    category: "image",
    icon: AppWindow,
    status: "available",
    href: "/tools/favicon-generator",
    accepts: IMAGE_AND_SVG_TYPES,
  },
];
