import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { TrimResult } from "@/lib/trim";
import { CropPreview } from "@/components/tools/image-clipper/crop-preview";

function result(overrides: Partial<TrimResult> = {}): TrimResult {
  return {
    blob: new Blob([], { type: "image/png" }),
    sourceWidth: 800,
    sourceHeight: 600,
    width: 200,
    height: 300,
    bounds: { left: 100, top: 150, right: 300, bottom: 450, width: 200, height: 300 },
    trimmed: true,
    isEmpty: false,
    ...overrides,
  };
}

describe("CropPreview", () => {
  it("says what will be kept", () => {
    render(<CropPreview src="blob:x" result={result()} />);
    expect(screen.getByText("Keeping 200 × 300")).toBeInTheDocument();
  });

  it("places the crop box as a percentage of the original", () => {
    const { container } = render(<CropPreview src="blob:x" result={result()} />);
    const box = container.querySelector<HTMLElement>(".border-primary");

    // 100/800, 150/600, 200/800, 300/600
    expect(box).toHaveStyle({
      left: "12.5%",
      top: "25%",
      width: "25%",
      height: "50%",
    });
  });

  it("gives the frame the source's aspect ratio so the overlay lines up", () => {
    const { container } = render(<CropPreview src="blob:x" result={result()} />);
    expect(container.firstChild).toHaveStyle({ aspectRatio: "800 / 600" });
  });

  it("shows the plain image when there is nothing to trim", () => {
    render(
      <CropPreview src="blob:x" result={result({ trimmed: false })} />,
    );
    expect(screen.getByText("Original")).toBeInTheDocument();
    expect(
      document.querySelector(".border-primary"),
    ).not.toBeInTheDocument();
  });

  it("falls back to a plain frame before the first result arrives", () => {
    const { container } = render(<CropPreview src="blob:x" />);
    expect(container.firstChild).toHaveClass("aspect-video");
    expect(screen.getByText("Original")).toBeInTheDocument();
  });
});
