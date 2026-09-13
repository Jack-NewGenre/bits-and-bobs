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

/**
 * Bundle named blobs into a zip. Kept apart from the download so it can be
 * tested against a real archive rather than a mock of the archiver.
 */
export async function buildZip(
  entries: { name: string; blob: Blob }[],
): Promise<Blob> {
  // client-zip streams the archive out as the entries are read, rather than
  // buffering every file twice the way a general-purpose zip library does.
  // The content field must be `input`: an entry with only a name is a valid
  // request for an empty *folder*, so getting this wrong yields an archive
  // full of directories rather than files, with no error anywhere.
  const { downloadZip: makeZip } = await import("client-zip");
  return makeZip(
    uniqueNames(entries).map(({ name, blob }) => ({ name, input: blob })),
  ).blob();
}

/** Bundle named blobs into a single zip and download it. */
export async function downloadZip(
  entries: { name: string; blob: Blob }[],
  zipName: string,
): Promise<void> {
  downloadBlob(await buildZip(entries), zipName);
}
