import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DEFAULT_ENHANCE_SETTINGS, ENHANCE_PRESETS } from "@/lib/enhance";
import { EnhanceOptions } from "@/components/tools/image-enhancer/enhance-options";

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
});
