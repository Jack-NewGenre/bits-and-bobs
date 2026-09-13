import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DEFAULT_TRIM_SETTINGS, MAX_PADDING } from "@/lib/image/trim";
import { ClipOptions } from "@/components/tools/image-clipper/clip-options";

describe("ClipOptions", () => {
  it("shows both controls with their current values", () => {
    render(
      <ClipOptions
        settings={{ threshold: 8, padding: 16 }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Edge threshold")).toBeInTheDocument();
    expect(screen.getByText("Padding")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument();
  });

  it("explains what each control is for", () => {
    render(
      <ClipOptions settings={DEFAULT_TRIM_SETTINGS} onChange={vi.fn()} />,
    );
    expect(screen.getByText(/near-invisible fringe/i)).toBeInTheDocument();
    expect(screen.getByText(/transparent margin/i)).toBeInTheDocument();
  });

  it("reports a padding change without disturbing the threshold", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ClipOptions
        settings={{ threshold: 8, padding: 0 }}
        onChange={onChange}
      />,
    );

    const padding = screen.getAllByRole("slider")[1];
    padding.focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenCalledWith({ threshold: 8, padding: 1 });
    expect(MAX_PADDING).toBeGreaterThan(0);
  });
});
