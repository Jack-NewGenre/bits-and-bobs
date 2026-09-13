/** Developer and text tools. */

import { Binary, Braces, Hash, KeyRound, Regex } from "lucide-react";

import type { Tool } from "@/lib/types";

export const DEV_TOOLS: Tool[] = [
  {
    slug: "json-formatter",
    name: "JSON Formatter",
    description: "Format, validate and minify JSON.",
    blurb:
      "Format, minify and validate JSON, with errors pointed at the line they are on. Nothing is uploaded.",
    category: "dev",
    icon: Braces,
    status: "available",
    href: "/tools/json-formatter",
  },
  {
    slug: "base64",
    name: "Base64 Encode / Decode",
    description:
      "Convert text to and from Base64, with URL-safe and Unicode support.",
    blurb:
      "Encode and decode Base64, with full Unicode and URL-safe support. Runs entirely in your browser.",
    category: "dev",
    icon: Binary,
    status: "available",
    href: "/tools/base64",
  },
  {
    slug: "jwt-decoder",
    name: "JWT Decoder",
    description: "Inspect the header and payload of a JSON Web Token.",
    blurb:
      "Read a token's header, payload and claims. Decoded on your device. The token never leaves it.",
    category: "dev",
    icon: KeyRound,
    status: "available",
    href: "/tools/jwt-decoder",
  },
  {
    slug: "hash-generator",
    name: "Hash Generator",
    description: "Generate SHA-1, SHA-256, SHA-384 and SHA-512 hashes.",
    blurb:
      "Hash text or a file with SHA-1, SHA-256, SHA-384 or SHA-512, and check it against a published checksum.",
    category: "dev",
    icon: Hash,
    status: "available",
    href: "/tools/hash-generator",
  },
  {
    slug: "regex-tester",
    name: "Regex Tester",
    description: "Test regular expressions against sample text.",
    blurb:
      "Test a regular expression against your own text, with live highlighting, captures and replace.",
    category: "dev",
    icon: Regex,
    status: "available",
    href: "/tools/regex-tester",
  },
];
