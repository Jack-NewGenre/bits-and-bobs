import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ColourSwatch } from "@/components/shared/colour-swatch";

const YELLOW = { r: 250, g: 204, b: 21, a: 1 };
const NAVY = { r: 30, g: 41, b: 59, a: 1 };

describe("ColourSwatch", () => {
  it("copies its hex when clicked", async () => {
    const user = userEvent.setup();
    render(<ColourSwatch colour={YELLOW} />);

    await user.click(screen.getByRole("button", { name: "Copy #facc15" }));
    expect(await navigator.clipboard.readText()).toBe("#facc15");
  });

  it("copies a supplied value instead when given one", async () => {
    const user = userEvent.setup();
    render(<ColourSwatch colour={YELLOW} copyValue="oklch(86% 0.17 92)" />);

    await user.click(
      screen.getByRole("button", { name: "Copy oklch(86% 0.17 92)" }),
    );
    expect(await navigator.clipboard.readText()).toBe("oklch(86% 0.17 92)");
  });

  it("shows its caption in whichever ink actually reads", () => {
    const { rerender } = render(
      <ColourSwatch colour={YELLOW} caption="500" />,
    );
    expect(screen.getByRole("button")).toHaveStyle({ color: "#000000" });

    rerender(<ColourSwatch colour={NAVY} caption="900" />);
    expect(screen.getByRole("button")).toHaveStyle({ color: "#ffffff" });
  });

  it("confirms the copy back to the user", async () => {
    const user = userEvent.setup();
    render(<ColourSwatch colour={YELLOW} />);

    await user.click(screen.getByRole("button"));
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });
});
