/** Colour tools. */

import { Contrast, Eye, Palette, Pipette, SwatchBook } from "lucide-react";

import type { Tool } from "@/lib/types";

export const COLOUR_TOOLS: Tool[] = [
  {
    slug: "colour-converter",
    name: "Colour Converter",
    description: "Convert between HEX, RGB, HSL and OKLCH with a live preview.",
    blurb:
      "Convert a colour between HEX, RGB, HSL and OKLCH. Everything runs on your device. Nothing is uploaded.",
    category: "colour",
    icon: Pipette,
    status: "available",
    href: "/tools/colour-converter",
  },
  {
    slug: "contrast-checker",
    name: "Contrast Checker",
    description:
      "Check WCAG AA and AAA contrast between a foreground and background.",
    blurb:
      "Check a text and background pair against the WCAG AA and AAA thresholds. Everything runs on your device.",
    category: "colour",
    icon: Contrast,
    status: "available",
    href: "/tools/contrast-checker",
  },
  {
    slug: "palette-generator",
    name: "Palette Generator",
    description:
      "Build complementary, analogous and triadic palettes from one colour.",
    blurb:
      "Build a harmonious palette from one colour, rotated in perceptual OKLCH space. Nothing is uploaded.",
    category: "colour",
    icon: Palette,
    status: "available",
    href: "/tools/palette-generator",
  },
  {
    slug: "tailwind-shades",
    name: "Tailwind Shades",
    description: "Generate a full 50–950 Tailwind scale from a single colour.",
    blurb:
      "Generate a full 50–950 Tailwind scale from a single colour, ready to paste into a v4 theme.",
    category: "colour",
    icon: SwatchBook,
    status: "available",
    href: "/tools/tailwind-shades",
  },
  {
    slug: "colour-blindness",
    name: "Colour Blindness Simulator",
    description:
      "See an image as someone with colour vision deficiency would see it.",
    blurb:
      "See an image as someone with colour vision deficiency would. Nothing is uploaded. It runs on your device.",
    category: "colour",
    icon: Eye,
    status: "available",
    href: "/tools/colour-blindness",
  },
];
