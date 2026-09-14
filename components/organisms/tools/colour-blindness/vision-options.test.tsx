import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { VISION_MODES } from "@/lib/colour/colour-blindness";
import { VisionOptions } from "@/components/organisms/tools/colour-blindness/vision-options";

describe("VisionOptions", () => {
  it("lists every vision type with how common it is", () => {
    render(<VisionOptions vision="deuteranopia" onChange={vi.fn()} />);

    for (const mode of VISION_MODES) {
      expect(
        screen.getByRole("button", { name: new RegExp(mode.label, "i") }),
      ).toBeInTheDocument();
    }
    expect(screen.getByText("~6% of men")).toBeInTheDocument();
  });

  it("marks the current choice and explains it", () => {
    render(<VisionOptions vision="tritanopia" onChange={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /tritanopia/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/No blue cone/i)).toBeInTheDocument();
  });

  it("reports a change", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<VisionOptions vision="deuteranopia" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /achromatopsia/i }));
    expect(onChange).toHaveBeenCalledWith("achromatopsia");
  });
});
