import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { BackgroundSettings } from "@/hooks/use-composited-result";
import { BackgroundOptions } from "@/components/tools/background-removal/background-options";

const baseSettings: BackgroundSettings = {
  mode: "transparent",
  color: "#ffffff",
};

describe("BackgroundOptions", () => {
  it("switches mode to solid colour and reveals presets", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <BackgroundOptions settings={baseSettings} onChange={onChange} />,
    );

    await user.click(screen.getByRole("tab", { name: /solid colour/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "color" }),
    );

    rerender(
      <BackgroundOptions
        settings={{ ...baseSettings, mode: "color" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText("Use #000000")).toBeInTheDocument();
  });

  it("emits a colour change when a preset is chosen", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BackgroundOptions
        settings={{ ...baseSettings, mode: "color" }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByLabelText("Use #000000"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "color", color: "#000000" }),
    );
  });

  it("shows the image picker in image mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BackgroundOptions settings={baseSettings} onChange={onChange} />);

    await user.click(screen.getByRole("tab", { name: /image/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "image" }),
    );
  });
});
