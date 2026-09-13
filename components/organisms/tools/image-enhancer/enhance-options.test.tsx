import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  DEFAULT_ENHANCE_SETTINGS,
  ENHANCE_PRESETS,
} from "@/lib/image/enhance-presets";
import { EnhanceOptions } from "@/components/organisms/tools/image-enhancer/enhance-options";

describe("EnhanceOptions", () => {
  it("renders every preset and upscale option", () => {
    render(
      <EnhanceOptions settings={DEFAULT_ENHANCE_SETTINGS} onChange={vi.fn()} />,
    );
    for (const preset of ENHANCE_PRESETS) {
      expect(
        screen.getByRole("button", { name: preset.label }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "1×" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2×" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4×" })).toBeInTheDocument();
  });

  it("applies a preset's settings when clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EnhanceOptions settings={DEFAULT_ENHANCE_SETTINGS} onChange={onChange} />,
    );

    const vivid = ENHANCE_PRESETS.find((preset) => preset.id === "vivid")!;
    await user.click(screen.getByRole("button", { name: vivid.label }));
    expect(onChange).toHaveBeenCalledWith(vivid.settings);
  });

  it("switches between the fast and AI upscalers", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EnhanceOptions settings={DEFAULT_ENHANCE_SETTINGS} onChange={onChange} />,
    );

    expect(screen.getByRole("button", { name: "Fast" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "AI" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ engine: "ai" }),
    );
  });

  it("explains what each upscaler does", () => {
    const { rerender } = render(
      <EnhanceOptions settings={DEFAULT_ENHANCE_SETTINGS} onChange={vi.fn()} />,
    );
    expect(screen.getByText(/cannot invent detail/i)).toBeInTheDocument();

    rerender(
      <EnhanceOptions
        settings={{ ...DEFAULT_ENHANCE_SETTINGS, engine: "ai" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/downloads once/i)).toBeInTheDocument();
  });

  it("disables the AI upscaler for images the model cannot take", () => {
    render(
      <EnhanceOptions
        settings={DEFAULT_ENHANCE_SETTINGS}
        onChange={vi.fn()}
        aiAvailable={false}
      />,
    );

    expect(screen.getByRole("button", { name: "AI" })).toBeDisabled();
    expect(screen.getByText(/too large for the AI upscaler/i)).toBeInTheDocument();
  });

  it("reflects and changes the upscale factor", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EnhanceOptions
        settings={{ ...DEFAULT_ENHANCE_SETTINGS, scale: 2 }}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("button", { name: "2×" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "4×" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ scale: 4 }),
    );
  });

  it("offers the output formats and reports a change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <EnhanceOptions settings={DEFAULT_ENHANCE_SETTINGS} onChange={onChange} />,
    );

    for (const label of ["Same", "PNG", "JPG", "WebP"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }

    await user.click(screen.getByRole("button", { name: "WebP" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ format: "image/webp" }),
    );
  });

  it("shows a quality slider only for the lossy formats", () => {
    const { rerender } = render(
      <EnhanceOptions
        settings={{ ...DEFAULT_ENHANCE_SETTINGS, format: "image/png" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText("Quality")).not.toBeInTheDocument();

    rerender(
      <EnhanceOptions
        settings={{ ...DEFAULT_ENHANCE_SETTINGS, format: "image/jpeg" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Quality")).toBeInTheDocument();
  });

  it("resolves \"Same\" against the dropped file's own type", () => {
    const { rerender } = render(
      <EnhanceOptions
        settings={DEFAULT_ENHANCE_SETTINGS}
        onChange={vi.fn()}
        sourceType="image/png"
      />,
    );
    expect(screen.queryByText("Quality")).not.toBeInTheDocument();

    rerender(
      <EnhanceOptions
        settings={DEFAULT_ENHANCE_SETTINGS}
        onChange={vi.fn()}
        sourceType="image/jpeg"
      />,
    );
    expect(screen.getByText("Quality")).toBeInTheDocument();
  });
});
