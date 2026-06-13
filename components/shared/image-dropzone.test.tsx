import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  ImageDropzone,
  MAX_FILE_BYTES,
  partitionFiles,
} from "@/components/shared/image-dropzone";

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
