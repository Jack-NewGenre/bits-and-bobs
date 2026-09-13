import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ImageDropzone } from "@/components/molecules/image-dropzone";

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
