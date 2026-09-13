// @vitest-environment node
import { describe, expect, it } from "vitest";

import { buildZip } from "@/lib/download";

/**
 * Read the names and uncompressed sizes out of a real zip's central
 * directory.
 *
 * The archiver is deliberately not mocked. A mock only proves it was called,
 * and calling it with the wrong field name produced archives full of empty
 * folders, which every mocked assertion passed happily. This runs in a node
 * environment because jsdom cannot cope with the archiver's streams.
 */
function readZip(bytes: Uint8Array): { name: string; size: number }[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries: { name: string; size: number }[] = [];

  for (let at = 0; at < bytes.length - 4; at++) {
    // Central directory file header.
    if (view.getUint32(at, true) !== 0x02014b50) continue;

    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const name = new TextDecoder().decode(
      bytes.subarray(at + 46, at + 46 + nameLength),
    );
    entries.push({ name, size });
  }

  return entries;
}

const archive = async (entries: { name: string; blob: Blob }[]) =>
  readZip(new Uint8Array(await (await buildZip(entries)).arrayBuffer()));

describe("buildZip", () => {
  it("puts real files in the archive, not empty folders", async () => {
    const found = await archive([
      { name: "a.txt", blob: new Blob(["hello world"]) },
      { name: "b.txt", blob: new Blob(["second file"]) },
    ]);

    expect(found.map((entry) => entry.name)).toEqual(["a.txt", "b.txt"]);
    // A folder entry carries a trailing slash and no content.
    expect(found.every((entry) => !entry.name.endsWith("/"))).toBe(true);
    expect(found.map((entry) => entry.size)).toEqual([11, 11]);
  });

  it("preserves the byte length of every file", async () => {
    const found = await archive([
      { name: "small.bin", blob: new Blob([new Uint8Array(10)]) },
      { name: "big.bin", blob: new Blob([new Uint8Array(5000)]) },
    ]);

    expect(found.map((entry) => entry.size)).toEqual([10, 5000]);
  });

  it("de-duplicates colliding names inside the archive", async () => {
    const found = await archive([
      { name: "cutout.png", blob: new Blob(["one"]) },
      { name: "cutout.png", blob: new Blob(["two"]) },
    ]);

    expect(found.map((entry) => entry.name)).toEqual([
      "cutout.png",
      "cutout-1.png",
    ]);
  });

  it("copes with an empty entry list", async () => {
    expect(await archive([])).toEqual([]);
  });
});
