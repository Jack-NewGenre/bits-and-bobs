# Changelog

All notable changes to this project. Newest first.

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
