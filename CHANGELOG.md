# Changelog

All notable changes to this project. Newest first.

## Unreleased

### Added
- **Case Converter**: paste text or a list of names and see it in camelCase, PascalCase, snake_case, CONSTANT_CASE, kebab-case, dot.case, Title Case, Sentence case, lower case and UPPER CASE, each ready to copy. A list stays a list: every line is converted on its own.
- **DESIGN.md Creator**: capture the colours, fonts, type scale, spacing, radii, shadows and component styles of any page you have open, then edit them and download a DESIGN.md that you or a coding agent can build a matching look from. Paste a URL and the site's page and stylesheets are fetched for you (the only thing sent is the address). For sites styled by JavaScript or behind a login, a bookmarklet captures the page in your own browser, or you can paste CSS or saved HTML.
- **Mascot**: Bob, the little builder from the icon, now sits at the top of the home page. His eyes follow your pointer, and every poke gets a different reaction (a hammer swing, a bounce, a spin or a wobble) and a word or two.
- **Command menu**: press ⌘K (Ctrl+K on Windows and Linux) anywhere, or the search button in the header, to jump straight to any tool, the home page or the changelog, roll a random tool, or switch theme. Type a few letters and press Enter.
- **Cutting-mat themes**: the site now looks like a self-healing cutting mat, ruled with a fine grid, and cards, dialogs and menus sit on it as sheets of paper. Every mat sits in the header as a small swatch, so you can see them all before you pick one: Light, Dark, Green or Blue, or follow your system. The command menu switches them too. A ruler runs along the top and left edges of the mat, lined up with the grid, Photo Studio lays your canvas on the mat, the home page has angle guides, and image drop zones have crop marks.

### Changed
- **Home page search**: ⌘K now opens the command menu rather than focusing the search box.

## 1.2.0 - 2026-10-10

### Added
- **Photo Studio**: a full-screen image editor with layers, layer and clipping masks, brushes, an eyedropper with a magnifier, fill, gradients, a clone stamp with a source crosshair and aligned or per-layer sampling, dodge and burn with shadow, midtone and highlight ranges, marquee, lasso and magic wand selections, crop, smart guides, text, shapes and adjustments including Curves and per-colour Hue/Saturation. Keyboard shortcuts follow Photoshop's. Work autosaves in your browser and saves as a project file. Private, free, no uploads.
- **Colour Atlas**: one page for one colour, with every notation, its tints and shades, harmonies, contrast on white and black, and how it looks with each kind of colour blindness.
- **Gradient Generator**: linear, radial and conic gradients with up to eight stops, blended in OKLab so the middle never turns grey. Copy the CSS or export a PNG.
- **Pixel Picker**: drop in an image and sample exact colours with a zoom loupe, averaging over a few pixels if you like. Works with the keyboard too.
- **Clip Art Cutter**: drop in a clip art or sticker sheet and lasso round the parts you want with the mouse, or draw boxes. Every piece on a transparent or plain background is also found for you. Move or delete any cut, and download each piece as a PNG or all of them as a zip, with the background made transparent if you like.
- **Sticker Maker**: drop in any picture and get a die-cut sticker back. The background is removed on your device (artwork that is already transparent is used as it is), then a border follows the outline with a soft shadow beneath. Keep the background instead to frame the whole picture, choose the border's thickness and colour, and download each sticker as a PNG or all of them as a zip.
- **Favicon Generator**: turn one PNG, JPG, WebP or SVG into favicon.ico, the Apple touch icon and the Android and PWA sizes, with the link tags to paste. Drag a square to choose which part of the image to use, round the corners anywhere from square to a circle, and fill the background with white, black or any colour.

### Changed
- **New name**: Toolbox is now Bits & Bobs.
- **Palette Generator**: four more harmonies (rectangle, double split, compound and golden), a shuffle button, and locks to keep the colours you like.
- **Colour Converter**: now shows Display P3 alongside HEX, RGB, HSL and OKLCH.

## 1.1.0 - 2026-09-14

### Changed
- **Image Converter, Image Compressor, Resize & Crop, Image Enhancer, PNG to SVG**: a batch now runs on several workers at once instead of queueing through one.
- **Background Remover**: the background is composited off the main thread, so the feather slider stays smooth on a large photo.
- **Background Remover, Colour Blindness Simulator**: downloading reuses the image already on screen rather than processing it a second time.
- **JSON Formatter, Regex Tester, Lorem Ipsum**: the output waits for a pause in typing instead of rebuilding on every keystroke.
- **Tailwind Shades**: the scale is only rebuilt when the colour changes, so dragging the picker no longer stutters.
- **Timestamp Converter**: the clock stops ticking once a fixed timestamp is typed in.

### Fixed
- **PNG to SVG**: photos taken in portrait on a phone were traced stretched, because the rotation stored alongside the image was ignored.
- **UUID Generator**: switching uppercase or hyphens just after changing the count silently reverted the switch.
- **UUID Generator**: the copied tick stayed on a row for good instead of clearing after a moment.

## 1.0.0 - 2026-09-13

First release. Every tool runs entirely in the browser and nothing is uploaded.

### Added
- **Image Converter**: convert images between formats.
- **Image Compressor**: shrink images without leaving the device.
- **Resize & Crop**: resize and crop images in bulk.
- **Image Clipper**: clip images to a shape or selection.
- **Image Enhancer**: sharpen, denoise and adjust images.
- **Background Remover**: cut the background out of an image.
- **PNG to SVG**: trace a raster image into vector paths.
- **Colour Converter**: convert a colour between formats.
- **Palette Extractor**: pull a palette out of an image.
- **Palette Generator**: build a harmonious palette from a base colour.
- **Tailwind Shades**: generate a Tailwind shade scale from one colour.
- **Contrast Checker**: check a colour pair against WCAG contrast ratios.
- **Colour Blindness Simulator**: preview colours as different types of colour blindness see them.
- **Images to PDF**: combine images into a single PDF.
- **PDF to Images**: export PDF pages as images.
- **Merge PDF**: join several PDFs into one.
- **Split PDF**: pull pages out of a PDF into a new file.
- **Base64 Encode / Decode**: encode and decode Base64.
- **JSON Formatter**: format and validate JSON.
- **JWT Decoder**: decode a JWT and inspect its claims.
- **Regex Tester**: test a regular expression against sample text.
- **Timestamp Converter**: convert between timestamps and dates.
- **Hash Generator**: hash text with common algorithms.
- **UUID Generator**: generate v4 UUIDs in bulk.
- **Password Generator**: generate strong passwords.
- **QR Code Generator**: turn text or a link into a QR code.
- **Lorem Ipsum**: generate placeholder text.
