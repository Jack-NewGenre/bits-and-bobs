<p align="center">
  <img src="public/logo.png" alt="Bits & Bobs mascot: a little orange builder in a hard hat, holding a hammer" width="128" height="128">
</p>

<h1 align="center">Bits &amp; Bobs</h1>

<p align="center">
  <strong>Free, private, everyday tools that never leave your device.</strong><br>
  A handy little box of 36 image, colour, PDF and developer tools, all built for the browser.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/tools-36-f59e0b" alt="36 tools">
  <img src="https://img.shields.io/badge/uploads-none-f59e0b" alt="No uploads">
  <img src="https://img.shields.io/badge/accounts-none-f59e0b" alt="No accounts">
  <img src="https://img.shields.io/badge/runs-in_your_browser-f59e0b" alt="Runs in your browser">
</p>

<p align="center">
  <a href="#included-tools">Tools</a> ·
  <a href="#installation">Installation</a> ·
  <a href="#the-tool-registry">Adding a tool</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

# Overview

Bits & Bobs is a collection of 36 small image, colour, PDF and developer tools that
run entirely in your browser. Files are read, worked on and written back on your
own machine. Nothing is uploaded, nothing is stored, and there is no account to
make.

It is built with [Next.js](https://nextjs.org) (App Router), React 19,
[Tailwind CSS](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com).
The heavy work runs in Web Workers and WebAssembly, so a 4x upscale or a
50-page PDF does not freeze the page. The AI tools use
[Transformers.js](https://huggingface.co/docs/transformers.js), which downloads
the model once and runs it on WebGPU where the browser offers it.

New tools are added regularly. Every release is recorded in
[CHANGELOG.md](CHANGELOG.md) and on the `/changelog` page.

# Rationale

Most online tools ask for an upload, an email address, or a subscription to
remove a watermark, and the thing you uploaded is now on somebody else's server.
Bits & Bobs is the answer to that: no logins, no paywalls, no upsells, no telemetry,
no queue. Open a page, drop a file, get it back. Once loaded, most of it works
with the network off.

Privacy here is not a policy, it is an architecture. There is no upload endpoint
to trust, because there is no server doing the work.

# Installation

Clone the repository and start the development server. [Bun](https://bun.sh) is
the package manager and the bundler for the workers.

```bash
bun install
bun run dev
```

The site runs on `localhost:3000`.

| Command | What it does |
| --- | --- |
| `bun run dev` | Build the web workers and start the dev server |
| `bun run build` | Build the workers and the production bundle |
| `bun run test` | Run the Vitest suite (jsdom) |
| `bun run test:watch` | Same, in watch mode |
| `bun run lint` | ESLint |

The worker build step is not optional. `lib/workers/*.ts` are bundled by Bun
into `public/*.js` because a browser worker needs a real URL to load, so the
dev, build and test scripts all run `build:worker` first.

# Included Tools

## Image (12)

- **Background Remover**: remove image backgrounds locally with AI.
- **Photo Studio**: edit images with layers, masks, brushes, selections, fill and gradients, crop, text, shapes and adjustments, with autosave and project files.
- **Image Enhancer**: upscale, sharpen and denoise low-quality images.
- **PNG to SVG**: trace PNG, JPG or WebP into scalable SVG vectors.
- **Clip Art Cutter**: lasso the parts of an image you want, or let a sheet's pieces be found, and save each as its own PNG.
- **Sticker Maker**: turn any picture into a die-cut sticker with a border and a shadow.
- **Image Clipper**: trim the transparent margin off a PNG.
- **Image Compressor**: shrink PNG, JPG and WebP without visible loss.
- **Image Converter**: convert between PNG, JPG and WebP.
- **Resize & Crop**: resize, crop and scale to exact dimensions.
- **Palette Extractor**: pull a colour palette out of any image.
- **Favicon Generator**: every favicon size, an ICO and the HTML from one image.

## Colour (8)

- **Colour Atlas**: every notation, shade, harmony and contrast grade for one colour.
- **Colour Converter**: convert between HEX, RGB, HSL, OKLCH and Display P3.
- **Contrast Checker**: check WCAG AA and AAA contrast between two colours.
- **Palette Generator**: build palettes from ten harmonies, with locks and shuffle.
- **Gradient Generator**: linear, radial and conic gradients, blended in OKLab.
- **Pixel Picker**: sample colours from any image with a zoom loupe.
- **Tailwind Shades**: generate a full 50–950 Tailwind scale from one colour.
- **Colour Blindness Simulator**: see an image as colour vision deficiency does.

## PDF (4)

- **Merge PDF**: combine several PDFs into one document.
- **Split PDF**: split a PDF into separate pages or ranges.
- **Images to PDF**: turn a set of images into a single PDF.
- **PDF to Images**: export each page of a PDF as an image.

## Dev & Text (7)

- **JSON Formatter**: format, validate and minify JSON.
- **Base64 Encode / Decode**: convert to and from Base64, URL-safe included.
- **JWT Decoder**: inspect the header and payload of a JSON Web Token.
- **Hash Generator**: generate SHA-1, SHA-256, SHA-384 and SHA-512 hashes.
- **Regex Tester**: test regular expressions against sample text.
- **Case Converter**: convert text to camelCase, snake_case, kebab-case and more.
- **DESIGN.md Creator**: paste a URL and get a DESIGN.md of the site's design tokens for your codebase.

## Generators (5)

- **QR Code Generator**: create QR codes for links and text.
- **Password Generator**: generate strong, random passwords.
- **UUID Generator**: generate v4 UUIDs in bulk.
- **Lorem Ipsum**: generate placeholder text by words or paragraphs.
- **Timestamp Converter**: convert between Unix timestamps and human dates.

# Layout

```
app/                     Routes. One thin file per tool page, plus sitemap/robots/error.
components/
  ui/                    shadcn primitives. Generated, so avoid hand-editing.
  shared/                Pieces reused across tools (dropzone, queue, result panels).
  tools/<slug>/          The UI for one tool.
  changelog/             The release timeline on /changelog.
lib/
  tool-registry/         The catalogue, one file per category.
  workers/               Worker entry points, their clients and the message protocol.
  *.ts                   Pure logic: colour maths, image transforms, encoding, hashing.
hooks/                   Shared client state (queues, live results, copy-to-clipboard).
```

The rule of thumb: **`lib/` is pure and testable, `components/` renders, `hooks/`
connects the two.** Image work that would block the main thread goes through a
worker rather than running inline.

# The tool registry

`lib/tool-registry/` is the single source of truth. The home page grid, the
sidebar, the page titles, `sitemap.xml` and every tool page all read from it, so
nothing about a tool is written down twice.

An entry is a discriminated union on `status`, so the type system enforces that
a built tool has a route and page copy and a planned one has neither:

```ts
{
  slug: "uuid",
  name: "UUID Generator",
  description: "Generate v4 UUIDs in bulk.",           // card and sidebar
  blurb: "Generate RFC 4122 version 4 UUIDs in bulk…", // under the page heading
  category: "generators",
  icon: IdCard,
  status: "available",
  href: "/tools/uuid",
}
```

## Adding a tool

1. Put the logic in `lib/<thing>.ts` with tests beside it in `lib/<thing>.test.ts`.
2. Build the UI in `components/tools/<slug>/<slug>-tool.tsx`.
3. Add the entry to the right file in `lib/tool-registry/`.
4. Create `app/tools/<slug>/page.tsx`:

   ```tsx
   import { createToolPage } from "@/components/tool-page";
   import { UuidTool } from "@/components/tools/uuid/uuid-tool";

   const { metadata, Page } = createToolPage("uuid", <UuidTool />);

   export { metadata };
   export default Page;
   ```

5. Add a line to `CHANGELOG.md` for the next release.

`createToolPage` reads the registry for the title, description, icon and page
copy. It throws if the slug is missing or still marked `soon`, so a mistake
fails the build instead of shipping a broken route. `lib/tools.test.ts` also
asserts the registry and the routes on disk agree in both directions.

# Changelog

`CHANGELOG.md` at the repo root is the single source of truth for releases. The
`/changelog` page parses it at build time (`lib/changelog.ts`), so a release is
written down once. Only the `Added`, `Changed`, `Fixed` and `Removed` headings
are rendered. The `changelog` skill in `.claude/skills/` writes the entries.

# Deployment

`lib/site.ts` resolves the canonical origin used by `metadataBase`, the sitemap
and `robots.txt`. On Vercel it picks up `VERCEL_PROJECT_PRODUCTION_URL`
automatically. Set `NEXT_PUBLIC_SITE_URL` to override it for a custom domain.

# Notes

- This is Next.js 16 (App Router, Turbopack). Its APIs differ from earlier
  versions in places, so check `node_modules/next/dist/docs/` before reaching
  for a remembered API. `error.tsx` takes `unstable_retry`, not `reset`.
- Every tool must keep the privacy promise on the home page: work happens on
  the device, and nothing is uploaded. The only server route is
  `app/api/fetch-page`, which fetches a public page by URL for the DESIGN.md
  Creator (browsers cannot, because of CORS). It never receives a file.
- No em dashes anywhere. See `CLAUDE.md`.
