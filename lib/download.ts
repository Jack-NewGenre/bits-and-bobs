/** Trigger a browser download for a blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Replace a filename's extension with `.png`. */
export function toPngName(name: string): string {
  return name.replace(/\.[^.]+$/, "") + ".png";
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Map a MIME type to a file extension, defaulting to `png`. */
export function extensionForType(type: string): string {
  return EXT_BY_TYPE[type] ?? "png";
}

/**
 * Insert a suffix before a filename's extension, optionally swapping the
 * extension. e.g. `withSuffix("photo.jpg", "-enhanced") → "photo-enhanced.jpg"`.
 */
export function withSuffix(name: string, suffix: string, ext?: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  const finalExt = ext ?? name.match(/\.([^.]+)$/)?.[1] ?? "png";
  return `${base}${suffix}.${finalExt}`;
}

/** Bundle named blobs into a single zip and download it. */
export async function downloadZip(
  entries: { name: string; blob: Blob }[],
  zipName: string,
): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const seen = new Map<string, number>();

  for (const { name, blob } of entries) {
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    // De-duplicate by inserting the counter before the real extension (which
    // may be .png, .jpg, .webp, …) so colliding names don't overwrite.
    const entryName =
      count === 0 ? name : name.replace(/(\.[^.]+)?$/, `-${count}$1`);
    zip.file(entryName, blob);
  }

  const archive = await zip.generateAsync({ type: "blob" });
  downloadBlob(archive, zipName);
}
