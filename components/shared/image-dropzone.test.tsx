import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  filesFromClipboard,
  ImageDropzone,
  MAX_FILE_BYTES,
  MAX_PDF_BYTES,
  partitionFiles,
  PDF_TYPES,
} from "@/components/shared/image-dropzone";

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

describe("ImageDropzone", () => {
  it("renders an accessible upload control", () => {
    render(<ImageDropzone onFiles={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /upload images/i }),
    ).toBeInTheDocument();
  });

  it("is focusable and activatable via keyboard", async () => {
    const user = userEvent.setup();
    render(<ImageDropzone onFiles={vi.fn()} />);
    const zone = screen.getByRole("button", { name: /upload images/i });
    await user.tab();
    expect(zone).toHaveFocus();
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

describe("ImageDropzone paste", () => {
  function pasteImage(type = "image/png") {
    const event = new Event("paste", {
      bubbles: true,
      cancelable: true,
    }) as Event & { clipboardData: { items: DataTransferItemList } };
    event.clipboardData = {
      items: clipboardItems([
        { kind: "file", type, file: makeFile("", type) },
      ]),
    };
    window.dispatchEvent(event);
    return event;
  }

  it("accepts an image pasted anywhere on the page", () => {
    const onFiles = vi.fn();
    render(<ImageDropzone onFiles={onFiles} />);

    pasteImage();

    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles.mock.calls[0][0][0].type).toBe("image/png");
  });

  it("stops listening once unmounted", () => {
    const onFiles = vi.fn();
    const { unmount } = render(<ImageDropzone onFiles={onFiles} />);
    unmount();

    pasteImage();
    expect(onFiles).not.toHaveBeenCalled();
  });

  it("ignores pastes while disabled", () => {
    const onFiles = vi.fn();
    render(<ImageDropzone onFiles={onFiles} disabled />);

    pasteImage();
    expect(onFiles).not.toHaveBeenCalled();
  });
});
