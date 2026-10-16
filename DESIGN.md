# Design

Bits & Bobs is styled as a self-healing cutting mat. The page is the mat, ruled
with a fine grid and printed with rulers, angle guides and crop marks. Anything
you work with (cards, dialogs, menus, chips) is a sheet of paper laid on top,
with a hard offset shadow.

This file is the source of truth for that look. **Any new visual element,
component style or token must be added here in the same change**, so the site
stays consistent.

## Principles

1. **Mat or paper, never in between.** Every surface is either the mat (the
   page background) or a sheet of paper on it. Decide which before styling.
2. **Print, don't paint.** Decoration on the mat is thin line work in the
   `mat-guide` and `mat-ruler` colours: 1px lines, dashes, mono labels. No
   gradients, glows, blurred shadows or illustrations.
3. **Everything lands on the grid.** The grid unit is 24px (`MAT_UNIT`).
   Rulers, guides and full-bleed decoration line up with it.
4. **Decoration stays behind text.** Printed elements are `aria-hidden`,
   `pointer-events-none`, low opacity, and sit under content. If one competes
   with copy, turn it down or move it.
5. **Tokens, not colours.** Components use the Tailwind aliases below. Never
   hard-code a hex value in a component: it will be wrong on three of the four
   mats.

## Themes

Four mats plus System, listed in `THEMES` (`lib/site.ts`), defined in
`app/themes.css`, and saved by `next-themes` in local storage.

| Theme | Mat (`--background`) | Ink (`--foreground`) | Primary | Guide line | Paper |
| ----- | -------------------- | -------------------- | ------- | ---------- | ----- |
| Light | `#f4f2ea` cream | `#1b1d1a` | `#1b1d1a` | coral | `#ffffff` |
| Dark | `#17181a` charcoal | `#e9e7e0` | `#e9e7e0` | coral | `#e9e7e0` |
| Green | `#1f432f` classic mat green | `#ecead9` | `#d2d574` citron | citron | `#f4f2ea` |
| Blue | `#1a64a0` studio blue | `#f3f9fd` | `#ffffff` | white | `#f6f9fb` |

- Dark, Green and Blue are dark mats (`color-scheme: dark`, the `dark:`
  variant applies). Paper is **always light**, on every mat.
- The focus ring is coral: `#d9502f` on light surfaces, `#ff8b6d` on dark
  mats.
- Muted text must clear WCAG AA (4.5:1) on its surface. Blue is a touch deeper
  than a real mat for this reason. Check contrast when adding or changing a
  colour.

### Adding a theme

1. Add a class block to `app/themes.css` setting every shadcn token, the four
   `--mat-*` tokens and the five `--paper-*` tokens.
2. If it is a dark mat, add it to the `.dark, .green, .blue` blocks in
   `themes.css` and to the `dark` custom variant in `app/globals.css`.
3. Add it to `THEMES` in `lib/site.ts` and to `THEME_OPTIONS` in
   `components/atoms/theme-toggle.tsx`.
4. Add a row to the table above.

## Tokens

### Mat

| Token | Tailwind | Use |
| ----- | -------- | --- |
| `--mat-minor` | (in `bg-mat`) | The fine grid line, every 24px |
| `--mat-major` | (in `bg-mat`) | The heavier grid line, every 120px |
| `--mat-guide` | `text-mat-guide`, `border-mat-guide` | Angle guides, crop marks, swatch diagonal |
| `--mat-ruler` | `text-mat-ruler` | Ruler ticks and numbers, dimension lines |

Keep the grid quiet: it is texture, not content. Minor lines sit around 4–6%
opacity and major lines around 9–16%.

### Paper

| Token | Use |
| ----- | --- |
| `--paper` | The sheet's colour |
| `--paper-ink` | Text on paper |
| `--paper-muted` | Secondary text on paper |
| `--paper-primary` | Primary buttons and selected states on paper |
| `--paper-shadow` | The hard offset shadow |

Inside a sheet, the paper rule in `themes.css` remaps the standard shadcn
tokens (`background`, `foreground`, `primary`, `muted`, `border`, `ring` and
so on) to paper values. So inside paper, just use the usual aliases:
`bg-background`, `text-muted-foreground`, `border-border`. Two derived tokens
exist only on paper: `--paper-wash` (5% ink, used for muted, secondary and
accent) and `--paper-line` (14% ink, used for borders and inputs).

### Standard aliases

Use `bg-background`, `text-foreground`, `bg-card`, `bg-primary`,
`text-primary-foreground`, `bg-secondary`, `bg-muted`,
`text-muted-foreground`, `bg-accent`, `border-border`, `text-destructive`,
`ring-ring`, plus `sidebar-*` and `chart-*`. Never raw `var(--…)` in a class
unless no alias exists (as with `--paper` in `MatSwatch`).

### Type

- **Sans** (`font-sans`, Geist): all UI copy and headings.
- **Mono** (`font-mono`, Geist Mono): printed mat elements, numbers, code.
  Printed labels are tiny: `text-[9px]` for ruler numbers, `text-[10px]
  uppercase tracking-wider` for dimension labels.
- Headings: `font-semibold tracking-tight`. Page title `text-3xl`, section
  title `text-lg`, card title `text-base`.
- Numbers that change or line up use `tabular-nums`.

### Radius

From `--radius` (`0.625rem`). Sheets are `rounded-xl`, icon tiles and swatches
`rounded-lg` or `rounded-md`, chips `rounded-full`.

## Surfaces

### The mat: `bg-mat`

A utility in `themes.css`: the background colour plus a 24px minor and 120px
major grid. Used on `SidebarInset` (the main page) and the Photo Studio
canvas area. The sidebar sits on `bg-sidebar` (the card colour) and the inset
is tucked under it by 1px (`md:-ml-px`) so the edge and the first grid line
share a pixel, rather than drawing a 2px line.

When drawing the grid smaller (as in `MatSwatch`), override `background-size`
only, keeping the 1:5 ratio.

### Paper sheets

These are paper automatically: `[data-slot="card"]`, `dialog-content`,
`popover-content`, `dropdown-menu-content`, `select-content`. Anything else
becomes paper with the `.paper` class.

A sheet gets:

- the paper colours and remapped tokens;
- a hard shadow, `3px 3px 0 var(--paper-shadow)`, applied through
  `--tw-shadow` so it overrides the primitive's own `shadow-*`;
- `color-scheme: light`, and the `dark:` variant switched off inside it.

When adding a new primitive that should be paper, add its `data-slot` to
**both** lists: the paper rule in `themes.css` and the `dark` custom variant
in `globals.css`.

### Lifting paper: `.paper-lift`

For a sheet you can pick up (tool cards, search chips). On hover the shadow
grows to `5px 5px 0` and, unless reduced motion is set, the sheet moves
`-2px -2px`. 150ms, ease-out. Do not combine it with a hover background that
lets the mat show through: hover states on paper must stay opaque.

### Header

Sticky, `h-14`, `bg-background/80` with a backdrop blur and a bottom border.
It sits on the mat, not on paper. The horizontal ruler starts at `top-14`, just
under it.

## Printed elements

All live in `components/atoms/`, are `aria-hidden` and `pointer-events-none`,
and take a `className`.

| Component | What it is | Where it is used |
| --------- | ---------- | ---------------- |
| `MatRuler` | Ticks every 24px, a longer tick every fifth, numbered in grid units (5, 10, 15…). `labels` sets how many numbers; `vertical` turns it on its side. | Top and left edges of the mat, in `SiteChrome` (`data-slot="mat-edge"`). It scrolls with the mat so ticks stay on the grid lines. |
| `AngleGuides` | 15°, 30°, 45°, 60°, 75° lines from the bottom-left corner, plus a protractor arc. 45° is solid, the rest dashed `4 5`. | Home page hero, at `opacity-60`. |
| `DimensionLine` | A technical-drawing dimension: bar, line, label, line, bar. | Under the hero title ("Private by default"). |
| `CropMarks` | Printer's crop marks just outside each corner. The parent must be positioned. | `ImageDropzone`. |
| `MatSwatch` | A 24px square of mat: grid, 45° guide, a corner of paper. Wears a theme class, so it shows that mat whatever the page is on. | `ThemePicker`. |

Rules for printed elements:

- Colour them with `text-mat-guide` or `text-mat-ruler` and draw with
  `currentColor`. Never pick a colour per theme.
- Lines are 1px, or `vectorEffect="non-scaling-stroke"` in SVG so they stay
  thin at any size.
- Keep them sparse: one or two per view. The mat is a backdrop.
- Position from a grid origin with `MAT_UNIT` so they land on the lines.

## Components

### Tool card (`ToolCard`)

A paper card with `paper-lift`. Icon tile `size-10 rounded-lg bg-muted`
(`bg-primary` when featured), arrow that nudges right on hover, title and
description. Hover: `border-primary/40 bg-accent`. Unavailable tools drop to
`opacity-70` with a "Soon" badge and no lift.

### Highlight tiles

Small paper sheets on the home page: `paper bg-card rounded-xl border p-4
shadow-xs`, a `size-9` muted icon tile and two lines of text.

### Chips and badges

Chips always have a solid background so the grid never shows through the
label. Search chips are `paper paper-lift rounded-full border px-3 py-1
text-sm`, and a pressed chip (`aria-pressed`) fills with `bg-primary
text-primary-foreground`. Badges use the shadcn `Badge` variants, which are
already filled.

### Dropzone (`ImageDropzone`)

`rounded-xl border-2 border-dashed`, with `CropMarks` around it. Hover:
`border-primary/50 bg-accent/30`. Dragging: `border-primary bg-accent/50`.

### Theme picker (`ThemePicker`)

A row of `MatSwatch` toggles plus a System icon, with a tooltip each. Hover
lifts the swatch `-translate-y-0.5`. The selected swatch gets a coral `ring-2`
with a 2px offset in the background colour. On narrow screens the header
falls back to the `ThemeToggle` dropdown.

### Focus

Every interactive element shows a visible coral ring
(`focus-visible:ring-ring` or `ring-ring/50` with `ring-3`). Never remove one
without a replacement.

## Motion

- Short and physical: 150ms ease-out for lifts and hovers.
- Movement is a couple of pixels, like paper being picked up.
- Anything that moves respects `prefers-reduced-motion` (see `.paper-lift`
  and `hooks/use-reduced-motion.ts`).

## Checklist for new UI

- [ ] Is it mat or paper? Paper uses a primitive or `.paper`.
- [ ] Only token aliases, no hard-coded colours.
- [ ] Checked on all four mats, including muted text contrast on paper.
- [ ] Hover states on paper stay opaque.
- [ ] Printed decoration is `aria-hidden`, `pointer-events-none`, on the grid
      and behind text.
- [ ] Focus ring visible.
- [ ] Motion respects reduced motion.
- [ ] This file updated with any new token, surface or component pattern.
