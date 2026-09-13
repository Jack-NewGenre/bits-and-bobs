/** PDF tools. */

import { FileText, FileType2, Combine, SplitSquareHorizontal } from "lucide-react";

import type { Tool } from "@/lib/types";

export const PDF_TOOLS: Tool[] = [
  {
    slug: "pdf-merge",
    name: "Merge PDF",
    description: "Combine several PDFs into one document.",
    category: "pdf",
    icon: Combine,
    blurb:
      "Join several PDFs into one, in whatever order you choose. Nothing is uploaded. It runs on your device.",
    status: "available",
    href: "/tools/pdf-merge",
  },
  {
    slug: "pdf-split",
    name: "Split PDF",
    description: "Split a PDF into separate pages or ranges.",
    category: "pdf",
    icon: SplitSquareHorizontal,
    blurb:
      "Pull out the pages you want, drop the ones you do not, or split a document into one file per page.",
    status: "available",
    href: "/tools/pdf-split",
  },
  {
    slug: "images-to-pdf",
    name: "Images to PDF",
    description: "Turn a set of images into a single PDF.",
    category: "pdf",
    icon: FileType2,
    blurb:
      "Turn a set of images into a single PDF, one image per page. Nothing is uploaded.",
    status: "available",
    href: "/tools/images-to-pdf",
  },
  {
    slug: "pdf-to-images",
    name: "PDF to Images",
    description: "Export each page of a PDF as an image.",
    category: "pdf",
    icon: FileText,
    blurb:
      "Render each page of a PDF as a PNG, at the resolution you need. Nothing is uploaded.",
    status: "available",
    href: "/tools/pdf-to-images",
  },
];
