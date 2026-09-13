/** Image tools. */

import {
  Crop,
  FileImage,
  Palette,
  Scaling,
  Scissors,
  Shrink,
  Spline,
  WandSparkles,
} from "lucide-react";

import type { Tool } from "@/lib/types";

export const IMAGE_TOOLS: Tool[] = [
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
  },
];
