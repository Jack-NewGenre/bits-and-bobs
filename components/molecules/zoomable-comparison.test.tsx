import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ZoomableComparison } from "@/components/molecules/zoomable-comparison";

function renderComparison() {
  return render(
    <ZoomableComparison
      beforeUrl="blob:before"
      afterUrl="blob:after"
      beforeLabel="Original"
      afterLabel="Output"
      caption="Drag to compare"
    />,
  );
}

describe("ZoomableComparison", () => {
  it("shows the caption and both labels", () => {
    renderComparison();

    expect(screen.getByText("Drag to compare")).toBeInTheDocument();
    expect(screen.getByText("Original")).toBeInTheDocument();
    expect(screen.getByText("Output")).toBeInTheDocument();
  });

  it("starts at Fit and follows the zoom the user picks", async () => {
    renderComparison();

    const fit = screen.getByRole("button", { name: "Fit" });
    expect(fit).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "2×" }));

    expect(screen.getByRole("button", { name: "2×" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(fit).toHaveAttribute("aria-pressed", "false");
  });
});
