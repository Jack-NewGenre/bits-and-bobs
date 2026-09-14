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

/**
 * Give every entry a unique name, keeping the real extension intact so a
 * collision produces `photo-1.png` rather than `photo.png-1`.
 */
export function uniqueNames(
  entries: { name: string; blob: Blob }[],
): { name: string; blob: Blob }[] {
  const seen = new Map<string, number>();

  return entries.map(({ name, blob }) => {
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    return {
      name: count === 0 ? name : name.replace(/(\.[^.]+)?$/, `-${count}$1`),
      blob,
    };
  });
}
