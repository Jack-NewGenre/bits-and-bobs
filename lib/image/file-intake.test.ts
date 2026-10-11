import { describe, expect, it } from "vitest";

import {
  filesFromClipboard,
  MAX_FILE_BYTES,
  MAX_PDF_BYTES,
  partitionFiles,
  PDF_TYPES,
  rejectionMessage,
} from "@/lib/image/file-intake";

/** Minimal stand-in for the clipboard's DataTransferItemList. */
function clipboardItems(
  entries: { kind: string; type: string; file?: File }[],
): DataTransferItemList {
  return entries.map((entry) => ({
    kind: entry.kind,
    type: entry.type,
    getAsFile: () => entry.file ?? null,
  })) as unknown as DataTransferItemList;
}

function makeFile(name: string, type: string, size = 1024): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("partitionFiles", () => {
  it("accepts supported image types", () => {
    const { accepted, rejected } = partitionFiles([
      makeFile("a.png", "image/png"),
      makeFile("b.jpg", "image/jpeg"),
      makeFile("c.webp", "image/webp"),
    ]);
    expect(accepted).toHaveLength(3);
    expect(rejected).toHaveLength(0);
  });

  it("rejects unsupported types", () => {
    const { accepted, rejected } = partitionFiles([
      makeFile("doc.pdf", "application/pdf"),
    ]);
    expect(accepted).toHaveLength(0);
    expect(rejected[0].reason).toMatch(/unsupported/i);
  });

  it("rejects files that are too large", () => {
    const { rejected } = partitionFiles([
      makeFile("huge.png", "image/png", MAX_FILE_BYTES + 1),
    ]);
    expect(rejected[0].reason).toMatch(/larger/i);
  });
});

describe("partitionFiles with other types and limits", () => {
  it("accepts PDFs when told to", () => {
    const { accepted, rejected } = partitionFiles(
      [makeFile("doc.pdf", "application/pdf")],
      PDF_TYPES,
    );
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(0);
  });

  it("rejects an image when only PDFs are wanted", () => {
    const { rejected } = partitionFiles(
      [makeFile("a.png", "image/png")],
      PDF_TYPES,
    );
    expect(rejected[0].reason).toBe("Unsupported file type");
  });

  it("honours a larger limit, and names it in the message", () => {
    const big = makeFile("scan.pdf", "application/pdf", MAX_FILE_BYTES + 1);

    expect(partitionFiles([big], PDF_TYPES).rejected[0].reason).toBe(
      "File is larger than 25MB",
    );
    expect(
      partitionFiles([big], PDF_TYPES, MAX_PDF_BYTES).accepted,
    ).toHaveLength(1);
  });

  it("still rejects a file past the larger limit", () => {
    const huge = makeFile("huge.pdf", "application/pdf", MAX_PDF_BYTES + 1);
    expect(
      partitionFiles([huge], PDF_TYPES, MAX_PDF_BYTES).rejected[0].reason,
    ).toBe("File is larger than 200MB");
  });
});

describe("filesFromClipboard", () => {
  it("picks up a pasted screenshot and gives it a real name", () => {
    const files = filesFromClipboard(
      clipboardItems([
        { kind: "file", type: "image/png", file: makeFile("", "image/png") },
      ]),
      1700000000000,
    );

    expect(files).toHaveLength(1);
    expect(files[0].name).toBe("pasted-1700000000000.png");
    expect(files[0].type).toBe("image/png");
  });

  it("ignores pasted text and non-image files", () => {
    const files = filesFromClipboard(
      clipboardItems([
        { kind: "string", type: "text/plain" },
        {
          kind: "file",
          type: "application/pdf",
          file: makeFile("doc.pdf", "application/pdf"),
        },
      ]),
    );
    expect(files).toEqual([]);
  });

  it("keeps multiple pasted images distinct", () => {
    const files = filesFromClipboard(
      clipboardItems([
        { kind: "file", type: "image/png", file: makeFile("", "image/png") },
        { kind: "file", type: "image/jpeg", file: makeFile("", "image/jpeg") },
      ]),
      1700000000000,
    );

    expect(files.map((file) => file.name)).toEqual([
      "pasted-1700000000000.png",
      "pasted-1700000000000-2.jpeg",
    ]);
  });

  it("copes with an empty clipboard", () => {
    expect(filesFromClipboard(undefined)).toEqual([]);
  });
});

describe("rejectionMessage", () => {
  it("names a single rejected file and its reason", () => {
    expect(
      rejectionMessage([{ name: "a.gif", reason: "Unsupported type" }]),
    ).toBe("a.gif: Unsupported type");
  });

  it("counts several rejected files", () => {
    const rejected = [
      { name: "a.gif", reason: "Unsupported type" },
      { name: "b.png", reason: "Too large" },
    ];
    expect(rejectionMessage(rejected)).toBe(
      "2 files skipped (unsupported type or too large)",
    );
  });
});
