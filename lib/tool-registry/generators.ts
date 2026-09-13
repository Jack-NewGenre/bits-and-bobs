/** Generators. */

import { AlignLeft, Clock, Fingerprint, IdCard, QrCode } from "lucide-react";

import type { Tool } from "@/lib/types";

export const GENERATORS_TOOLS: Tool[] = [
  {
    slug: "qr-code",
    name: "QR Code Generator",
    description: "Create QR codes for links, text and more.",
    blurb:
      "Turn a link or any text into a styled QR code, and download it as PNG or SVG. Encoded on your device.",
    category: "generators",
    icon: QrCode,
    status: "available",
    href: "/tools/qr-code",
  },
  {
    slug: "password",
    name: "Password Generator",
    description: "Generate strong, random passwords.",
    blurb:
      "Create strong, random passwords with the Web Crypto API. Nothing leaves your device.",
    category: "generators",
    icon: Fingerprint,
    status: "available",
    href: "/tools/password",
  },
  {
    slug: "uuid",
    name: "UUID Generator",
    description: "Generate v4 UUIDs in bulk.",
    blurb:
      "Generate RFC 4122 version 4 UUIDs in bulk. Everything happens in your browser.",
    category: "generators",
    icon: IdCard,
    status: "available",
    href: "/tools/uuid",
  },
  {
    slug: "lorem-ipsum",
    name: "Lorem Ipsum",
    description: "Generate placeholder text by words or paragraphs.",
    blurb:
      "Generate placeholder paragraphs, sentences or words for a layout. Nothing is uploaded.",
    category: "generators",
    icon: AlignLeft,
    status: "available",
    href: "/tools/lorem-ipsum",
  },
  {
    slug: "timestamp",
    name: "Timestamp Converter",
    description: "Convert between Unix timestamps and human dates.",
    blurb:
      "Convert between Unix timestamps and human-readable dates, in your local time zone.",
    category: "generators",
    icon: Clock,
    status: "available",
    href: "/tools/timestamp",
  },
];
