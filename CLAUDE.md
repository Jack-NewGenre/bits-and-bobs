@AGENTS.md

# Toolbox

A single Next.js app: 27 small image, colour, PDF and developer tools that run
entirely in the browser. No server does any work, nothing is uploaded, there are
no accounts. Heavy jobs run in Web Workers and WebAssembly.

## Quick Commands

```bash
bun run dev          # Build the workers, then start the dev server (:3000)
bun run build        # Build the workers, then the production bundle
bun run test         # Vitest suite (jsdom)
bun run test:watch   # Same, in watch mode
bun run lint         # ESLint
```

**Always use `bun`**, never npm, yarn or pnpm.

`build:worker` is not optional. `lib/workers/*.ts` are bundled by Bun into
`public/*.js` because a browser worker needs a real URL to load it, so the dev,
build and test scripts all run it first.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **Styling**: Tailwind CSS v4 + shadcn/ui (radix-nova) + CVA
- **Icons**: lucide-react
- **Testing**: Vitest + Testing Library (jsdom)
- **Heavy work**: Web Workers, WebAssembly, Transformers.js (WebGPU where offered)
- **Package manager**: Bun

## Project Structure

```
/
├── app/                      # App Router
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home: the tool catalogue
│   ├── globals.css           # Tailwind theme, tokens, CSS variables
│   ├── changelog/            # /changelog, rendered from CHANGELOG.md
│   └── tools/<slug>/page.tsx # One thin page per tool
├── components/               # Atomic design, see Component Guidelines
│   ├── ui/                   # shadcn/ui primitives (DO NOT EDIT)
│   ├── atoms/                # Smallest building blocks
│   ├── molecules/            # Composed atoms
│   ├── organisms/            # Page sections
│   │   └── tools/<slug>/     # The UI for one tool
│   └── layout/               # Site-level wrappers
├── hooks/                    # Custom React hooks
├── lib/                      # Pure logic, grouped by domain
│   ├── colour/               # Conversion, harmony, contrast, palettes
│   ├── image/                # Pixels: transform, enhance, trace, compose
│   ├── pdf/                  # Page handling and editing
│   ├── text/                 # Encoding, hashing, parsing, formatting
│   ├── generators/           # Things invented from nothing
│   ├── tool-registry/        # The tool catalogue, one file per category
│   ├── workers/              # Worker entrypoints, clients and protocol
│   └── *.ts                  # Cross-cutting: utils, download, zip, site, tools, types
├── types/                    # Ambient declarations for untyped packages
├── public/                   # Static assets + the built workers
└── test/setup.ts             # Vitest setup
```

Tests sit next to what they test: `lib/generators/uuid.ts` and
`lib/generators/uuid.test.ts`.

No barrel `index.ts` files: import the module you want, directly. The one
`index.ts` in `lib/tool-registry/` is not a barrel, it assembles the five
category lists into the single `TOOLS` catalogue.

## Code Conventions

### Naming

| What          | Convention | Example                              |
| ------------- | ---------- | ------------------------------------ |
| Files         | kebab-case | `tool-card.tsx`, `colour-blindness.ts` |
| Components    | PascalCase | `ToolCard`, `UuidTool`               |
| Hooks         | camelCase  | `useCopy`, `useImageQueue`           |
| Utilities     | camelCase  | `cn`, `getToolBySlug`                |
| Types         | PascalCase | `AvailableTool`, `UuidOptions`       |
| Constants     | SCREAMING_SNAKE | `TOOLS`, `MAX_COUNT`            |
| CSS variables | kebab-case | `--color-primary`                    |

### Formatting

Double quotes, semicolons, 2-space indent, 100 char width, ES5 trailing commas.

### Imports

Always use the `@/` alias, never relative paths across folders:

```typescript
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
```

### Class Merging

Always use `cn()` for conditional or merged Tailwind classes:

```typescript
<div className={cn("base-classes", condition && "conditional", className)} />
```

### CVA for Variants

Use `class-variance-authority` for components with visual variants:

```typescript
import { cva, type VariantProps } from "class-variance-authority";

const myVariants = cva("base-classes", {
  variants: { size: { sm: "text-sm", md: "text-base" } },
  defaultVariants: { size: "md" },
});
```

## Component Guidelines

### Atomic Design

Every component sits in exactly one layer. Before writing one, decide its layer,
then check whether the layer already has it.

- **`ui/`**: shadcn/ui primitives. Add via `bunx shadcn@latest add <component>`,
  never edit directly.
- **`atoms/`**: one job, no custom children. A copy button, a swatch, a pill, a
  slider row, an error line. Composes `ui/` primitives and nothing else.
- **`molecules/`**: a few atoms working together as one control. A labelled
  colour input, a dropzone, a file list, a queue list, a tool card.
- **`organisms/`**: a whole section of a page, holding real state or layout. The
  tool shells, the result panels, `tools/<slug>/` for each tool's own UI.
- **`layout/`**: site-level wrappers used by the root layout. Header, sidebar,
  theme provider.

Rules:

- A component may only import from its own layer or below it. An atom never
  imports a molecule.
- Anything inside `organisms/tools/<slug>/` belongs to that tool alone. The
  moment a second tool wants it, promote it to a molecule or an organism rather
  than copying it.
- One component per file, named after the file.

### Server vs Client Components

Server components by default. Only add `"use client"` when you need React hooks,
browser APIs, DOM event handlers, or a client-only library. Tool pages under
`app/tools/` stay server components: they call `createToolPage()` and hand it a
client component from `components/organisms/tools/`.

### Props & Exports

- Named exports: `export function MyComponent`
- Atoms and molecules accept `className?: string` and merge it with `cn()`, so a
  caller can adjust spacing without a wrapper. Organisms own their own layout
  and do not need one.
- Export types alongside: `export type { MyComponentProps }`

### Logic Lives in `lib/`

Components render, `lib/` computes. Anything pure (colour maths, PDF page
handling, hashing, formatting) belongs in a `lib/<domain>/*.ts` file with its
own unit test, not inside a component. Anything slow belongs in a worker under
`lib/workers/`, behind its client.

## Adding a Tool

1. Add the entry to the right file in `lib/tool-registry/` (`image`, `colour`,
   `dev`, `pdf` or `generators`), with `status: "available"`, an `href`, a
   `description` and a `blurb`. All copy for a tool lives there.
2. Put the pure logic in `lib/<domain>/<name>.ts` with a colocated test,
   where `<domain>` is `colour`, `image`, `pdf`, `text` or `generators`.
3. Build the UI in `components/organisms/tools/<slug>/`, reusing existing
   atoms and molecules before writing anything new.
4. Add `app/tools/<slug>/page.tsx` using `createToolPage(slug, <Tool />)`.
5. Update `CHANGELOG.md` (see the `changelog` skill) and the README tool list.

## Software Principles

- **KISS**: Keep solutions simple. Choose the straightforward approach.
- **DRY**: Extract shared logic only when there are 3+ usages. Don't abstract
  prematurely. If an existing component or hook can be extended without breaking
  its other callers, extend it rather than writing a new one.
- **Clean code**: Descriptive names, small focused functions, single responsibility.
- **No over-engineering**: Don't add features, config or abstractions beyond what
  is needed right now.
- **Minimal comments**: Code should be self-explanatory. Comment only the
  non-obvious "why".
- **File size**: No file should exceed 300 lines. If it does, it needs splitting.
- **No `any`**: Never use the `any` type, and never use a comment to permit one.
  Never inline-comment an ESLint exception either.

## Privacy Constraints

These are architectural, not preferences. Do not break them:

- No upload endpoints, no API routes that receive user files, no telemetry, no
  analytics, no third-party request carrying user data.
- All file work happens on the user's machine: `File`, `Blob`, `Canvas`,
  `OffscreenCanvas`, workers, WebAssembly.
- Model downloads (Transformers.js) are the only large network fetch, and they
  fetch a model, never send anything.

## Design Tokens

Tokens live in `app/globals.css`: shadcn/ui CSS variables in `:root` and `.dark`,
mapped into Tailwind through `@theme inline`.

Use the Tailwind aliases in components, not raw variables:
`bg-background`, `text-foreground`, `bg-card`, `text-primary`, `bg-secondary`,
`bg-muted`, `text-muted-foreground`, `bg-accent`, `border-border`,
`text-destructive`, plus the `sidebar-*` and `chart-*` families.

Radii scale from a single `--radius` (`0.625rem`): `rounded-sm`, `rounded-md`,
`rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-4xl`.

Dark mode is a real site-wide theme, handled by `next-themes` and the `.dark`
class. Never hard-code a colour that only works in one of the two.

## Testing

- Vitest with jsdom, Testing Library for components and hooks.
- Every `lib/` module with real logic gets a colocated `*.test.ts`.
- Components and hooks with behaviour worth protecting get a `*.test.tsx`.
- All tests must pass before a PR is merged. If a new or changed feature has no
  test, ask via the AskUserQuestion tool rather than skipping it.
- Before pushing: `bun run lint && bun run test`.

## Files to Never Edit Manually

- `components/ui/*`: managed by the shadcn/ui CLI
- `public/image-worker.js`, `public/text-worker.js`, `public/pdf.worker.min.mjs`:
  generated by `bun run build:worker`
- `next-env.d.ts`: generated by Next.js

# Writing style

Applies to everything: UI copy, code comments, JSDoc, commit messages, PR
descriptions, markdown files and chat replies.

- **Never use an em dash (the long dash character).** Not in prose, not in
  strings, not in comments. Use a colon, a comma, a full stop or brackets
  instead. It is the clearest tell of generated writing and it is not wanted
  anywhere in this repo.
- En dashes are only for number ranges (`0–100`, `50–950`). Never as a
  sentence separator.
- British English throughout.

Before finishing a change, check your own diff for the character:

```bash
git diff | grep -n "—"
```
