import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DEFAULT_VECTORIZE_SETTINGS, VECTORIZE_PRESETS } from "@/lib/image/vectorize";
import { VectorizeOptions } from "@/components/tools/png-to-svg/vectorize-options";

describe("VectorizeOptions", () => {
  it("renders every preset and mode option", () => {
    render(
      <VectorizeOptions
        settings={DEFAULT_VECTORIZE_SETTINGS}
        onChange={vi.fn()}
      />,
    );
    for (const preset of VECTORIZE_PRESETS) {
      expect(
        screen.getByRole("button", { name: preset.label }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Colour" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Greyscale" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Black & white" }),
    ).toBeInTheDocument();
  });

  it("applies a preset's settings when clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <VectorizeOptions
        settings={DEFAULT_VECTORIZE_SETTINGS}
        onChange={onChange}
      />,
    );

    const poster = VECTORIZE_PRESETS.find((preset) => preset.id === "poster")!;
    await user.click(screen.getByRole("button", { name: poster.label }));
    expect(onChange).toHaveBeenCalledWith(poster.settings);
  });

  it("reflects and changes the trace mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <VectorizeOptions
        settings={DEFAULT_VECTORIZE_SETTINGS}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("button", { name: "Colour" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Black & white" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "bw" }),
    );
  });

  it("disables the colours slider in black & white mode", () => {
    render(
      <VectorizeOptions
        settings={{ ...DEFAULT_VECTORIZE_SETTINGS, mode: "bw" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("slider", { name: "Colours" })).toHaveAttribute(
      "data-disabled",
    );
  });
});
