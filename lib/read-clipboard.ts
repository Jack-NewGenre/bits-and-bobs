/** What a "Paste" button found: images as files, or failing that, text. */
export interface ClipboardContents {
  files: File[];
  text: string;
}

/**
 * Reads the clipboard after a click. The browser may ask for permission or
 * refuse outright, so callers should be ready for this to reject.
 */
export async function readClipboard(
  clipboard: Clipboard = navigator.clipboard,
  now: number = Date.now(),
): Promise<ClipboardContents> {
  if (!clipboard.read) return { files: [], text: await clipboard.readText() };

  const items = await clipboard.read();
  const images = items.flatMap((item) =>
    item.types
      .filter((type) => type.startsWith("image/"))
      .map((type) => item.getType(type)),
  );
  const blobs = await Promise.all(images);
  const files = blobs.map((blob, index) => {
    const extension = blob.type.split("/")[1] ?? "png";
    const suffix = index === 0 ? "" : `-${index + 1}`;
    return new File([blob], `pasted-${now}${suffix}.${extension}`, {
      type: blob.type,
    });
  });
  if (files.length > 0) return { files, text: "" };

  const textItem = items.find((item) => item.types.includes("text/plain"));
  const text = textItem
    ? await (await textItem.getType("text/plain")).text()
    : "";
  return { files: [], text };
}
