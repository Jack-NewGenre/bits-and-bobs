import {
  Binary,
  Braces,
  Crop,
  FileImage,
  FileText,
  FileType2,
  Fingerprint,
  Hash,
  Image as ImageIcon,
  KeyRound,
  Combine,
  Palette,
  QrCode,
  Regex,
  Scissors,
  Shrink,
  Spline,
  SplitSquareHorizontal,
  Type,
  Clock,
  GitCompareArrows,
  WandSparkles,
} from "lucide-react";

import type { Tool, ToolCategory, ToolCategoryId } from "@/lib/types";

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: "image",
    name: "Image",
    description: "Edit, convert and optimise images entirely in your browser.",
  },
  {
    id: "dev",
    name: "Dev & Text",
    description: "Everyday developer and text utilities.",
  },
  {
    id: "pdf",
    name: "PDF",
    description: "Combine, split and convert PDF documents.",
  },
  {
    id: "generators",
    name: "Generators",
    description: "Generate codes, secrets and placeholder content.",
  },
];

export const TOOLS: Tool[] = [
  // Image
  {
    slug: "background-removal",
    name: "Background Remover",
    description:
      "Remove image backgrounds locally with AI. Private, free, no uploads.",
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
    category: "image",
    icon: Spline,
    status: "available",
    href: "/tools/png-to-svg",
  },
  {
    slug: "image-compressor",
    name: "Image Compressor",
    description: "Shrink PNG, JPG and WebP files without noticeable quality loss.",
    category: "image",
    icon: Shrink,
    status: "soon",
  },
  {
    slug: "image-converter",
    name: "Image Converter",
    description: "Convert between PNG, JPG, WebP and AVIF.",
    category: "image",
    icon: FileImage,
    status: "soon",
  },
  {
    slug: "image-resizer",
    name: "Resize & Crop",
    description: "Resize, crop and scale images to exact dimensions.",
    category: "image",
    icon: Crop,
    status: "soon",
  },
  {
    slug: "palette-extractor",
    name: "Palette Extractor",
    description: "Pull a colour palette out of any image.",
    category: "image",
    icon: Palette,
    status: "soon",
  },
  // Dev & Text
  {
    slug: "json-formatter",
    name: "JSON Formatter",
    description: "Format, validate and minify JSON.",
    category: "dev",
    icon: Braces,
    status: "soon",
  },
  {
    slug: "base64",
    name: "Base64 Encode / Decode",
    description: "Convert text to and from Base64, with URL-safe and Unicode support.",
    category: "dev",
    icon: Binary,
    status: "available",
    href: "/tools/base64",
  },
  {
    slug: "jwt-decoder",
    name: "JWT Decoder",
    description: "Inspect the header and payload of a JSON Web Token.",
    category: "dev",
    icon: KeyRound,
    status: "soon",
  },
  {
    slug: "hash-generator",
    name: "Hash Generator",
    description: "Generate MD5, SHA-1 and SHA-256 hashes.",
    category: "dev",
    icon: Hash,
    status: "soon",
  },
  {
    slug: "regex-tester",
    name: "Regex Tester",
    description: "Test regular expressions against sample text.",
    category: "dev",
    icon: Regex,
    status: "soon",
  },
  {
    slug: "diff-checker",
    name: "Diff Checker",
    description: "Compare two blocks of text line by line.",
    category: "dev",
    icon: GitCompareArrows,
    status: "soon",
  },
  // PDF
  {
    slug: "pdf-merge",
    name: "Merge PDF",
    description: "Combine several PDFs into one document.",
    category: "pdf",
    icon: Combine,
    status: "soon",
  },
  {
    slug: "pdf-split",
    name: "Split PDF",
    description: "Split a PDF into separate pages or ranges.",
    category: "pdf",
    icon: SplitSquareHorizontal,
    status: "soon",
  },
  {
    slug: "images-to-pdf",
    name: "Images to PDF",
    description: "Turn a set of images into a single PDF.",
    category: "pdf",
    icon: FileType2,
    status: "soon",
  },
  {
    slug: "pdf-to-images",
    name: "PDF to Images",
    description: "Export each page of a PDF as an image.",
    category: "pdf",
    icon: FileText,
    status: "soon",
  },
  // Generators
  {
    slug: "qr-code",
    name: "QR Code Generator",
    description: "Create QR codes for links, text and more.",
    category: "generators",
    icon: QrCode,
    status: "soon",
  },
  {
    slug: "password",
    name: "Password Generator",
    description: "Generate strong, random passwords.",
    category: "generators",
    icon: Fingerprint,
    status: "available",
    href: "/tools/password",
  },
  {
    slug: "uuid",
    name: "UUID Generator",
    description: "Generate v4 UUIDs in bulk.",
    category: "generators",
    icon: Type,
    status: "available",
    href: "/tools/uuid",
  },
  {
    slug: "lorem-ipsum",
    name: "Lorem Ipsum",
    description: "Generate placeholder text by words or paragraphs.",
    category: "generators",
    icon: ImageIcon,
    status: "soon",
  },
  {
    slug: "timestamp",
    name: "Timestamp Converter",
    description: "Convert between Unix timestamps and human dates.",
    category: "generators",
    icon: Clock,
    status: "available",
    href: "/tools/timestamp",
  },
];

export function getToolsByCategory(category: ToolCategoryId): Tool[] {
  return TOOLS.filter((tool) => tool.category === category);
}

export function getToolBySlug(slug: string): Tool | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}

export const AVAILABLE_TOOLS = TOOLS.filter(
  (tool) => tool.status === "available",
);
