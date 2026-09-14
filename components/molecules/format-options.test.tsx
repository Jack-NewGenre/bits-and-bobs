import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FormatOptions } from "@/components/molecules/format-options";

function renderOptions(overrides: Partial<Parameters<typeof FormatOptions>[0]> = {}) {
  const props = {
    format: "source" as const,
    quality: 80,
    matte: "#ffffff",
    onFormatChange: vi.fn(),
    onQualityChange: vi.fn(),
    onMatteChange: vi.fn(),
    ...overrides,
  };
  render(<FormatOptions {...props} />);
  return props;
}

describe("FormatOptions", () => {
  it("offers every output format", () => {
    renderOptions();
    for (const label of ["Same", "PNG", "JPG", "WebP"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("reports a format change", async () => {
    const user = userEvent.setup();
    const props = renderOptions();

    await user.click(screen.getByRole("button", { name: "WebP" }));
    expect(props.onFormatChange).toHaveBeenCalledWith("image/webp");
  });

  it("shows the quality slider only where it does something", () => {
    renderOptions({ format: "image/png" });
    expect(screen.queryByText("Quality")).not.toBeInTheDocument();

    render(
      <FormatOptions
        format="image/jpeg"
        quality={80}
        matte="#ffffff"
        onFormatChange={vi.fn()}
        onQualityChange={vi.fn()}
        onMatteChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Quality")).toBeInTheDocument();
  });

  it("resolves \"Same\" against the source file's type", () => {
    renderOptions({ sourceType: "image/jpeg" });
    expect(screen.getByText("Quality")).toBeInTheDocument();
  });

  it("asks for a matte only when the target format has no alpha", () => {
    renderOptions({ format: "image/png" });
    expect(screen.queryByLabelText("Matte colour")).not.toBeInTheDocument();

    render(
      <FormatOptions
        format="image/jpeg"
        quality={80}
        matte="#ffffff"
        onFormatChange={vi.fn()}
        onQualityChange={vi.fn()}
        onMatteChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Matte colour")).toBeInTheDocument();
    expect(screen.getByText(/no transparency/i)).toBeInTheDocument();
  });

  it("can hide the matte entirely for tools that never need it", () => {
    renderOptions({ format: "image/jpeg", showMatte: false });
    expect(screen.queryByLabelText("Matte colour")).not.toBeInTheDocument();
  });
});
