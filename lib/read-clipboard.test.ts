import { describe, expect, it } from "vitest";

import { readClipboard } from "@/lib/read-clipboard";

function item(blobs: Record<string, Blob>): ClipboardItem {
  return {
    types: Object.keys(blobs),
    getType: async (type: string) => blobs[type],
    presentationStyle: "unspecified",
  } as ClipboardItem;
}

function clipboard(items: ClipboardItem[]): Clipboard {
  return {
    read: async () => items,
    readText: async () => "",
  } as unknown as Clipboard;
}

describe("readClipboard", () => {
  it("turns copied images into named files", async () => {
    const png = new Blob(["x"], { type: "image/png" });
    const result = await readClipboard(
      clipboard([item({ "image/png": png })]),
      7,
    );
    expect(result.text).toBe("");
    expect(result.files.map((file) => [file.name, file.type])).toEqual([
      ["pasted-7.png", "image/png"],
    ]);
  });

  it("returns the text when there is no image", async () => {
    const text = new Blob(["merge pdf"], { type: "text/plain" });
    const result = await readClipboard(
      clipboard([item({ "text/plain": text })]),
    );
    expect(result).toEqual({ files: [], text: "merge pdf" });
  });

  it("returns nothing for an empty clipboard", async () => {
    expect(await readClipboard(clipboard([]))).toEqual({ files: [], text: "" });
  });

  it("falls back to plain text where reading items is unsupported", async () => {
    const textOnly = { readText: async () => "uuid" } as unknown as Clipboard;
    expect(await readClipboard(textOnly)).toEqual({ files: [], text: "uuid" });
  });
});
