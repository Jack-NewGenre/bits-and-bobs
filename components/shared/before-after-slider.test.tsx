import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BeforeAfterSlider } from "@/components/shared/before-after-slider";

function renderSlider() {
  render(
    <BeforeAfterSlider
      beforeUrl="blob:before"
      afterUrl="blob:after"
      beforeLabel="Original"
      afterLabel="Enhanced"
    />,
  );
  return screen.getByRole("slider");
}

describe("BeforeAfterSlider", () => {
  it("exposes the handle as a labelled slider starting at the midpoint", () => {
    const slider = renderSlider();
    expect(slider).toHaveAttribute("aria-valuenow", "50");
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "100");
    expect(slider).toHaveAccessibleName("Reveal Original over Enhanced");
  });

  it("moves with the arrow keys once focused", async () => {
    const user = userEvent.setup();
    const slider = renderSlider();

    await user.tab();
    expect(slider).toHaveFocus();

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(slider).toHaveAttribute("aria-valuenow", "54");

    await user.keyboard("{ArrowLeft}");
    expect(slider).toHaveAttribute("aria-valuenow", "52");
  });

  it("takes a larger step with shift and jumps to the ends", async () => {
    const user = userEvent.setup();
    const slider = renderSlider();
    slider.focus();

    await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
    expect(slider).toHaveAttribute("aria-valuenow", "60");

    await user.keyboard("{Home}");
    expect(slider).toHaveAttribute("aria-valuenow", "0");

    await user.keyboard("{End}");
    expect(slider).toHaveAttribute("aria-valuenow", "100");
  });

  it("never moves past either edge", async () => {
    const user = userEvent.setup();
    const slider = renderSlider();
    slider.focus();

    await user.keyboard("{Home}{ArrowLeft}{ArrowLeft}");
    expect(slider).toHaveAttribute("aria-valuenow", "0");

    await user.keyboard("{End}{ArrowRight}");
    expect(slider).toHaveAttribute("aria-valuenow", "100");
  });
});
