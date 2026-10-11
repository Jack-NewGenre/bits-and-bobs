import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ColourAtlasTool } from "@/components/organisms/tools/colour-atlas/colour-atlas-tool";

describe("ColourAtlasTool", () => {
  it("names the colour and gives its OKLCH facts", () => {
    render(<ColourAtlasTool />);
    expect(screen.getByText("blue")).toBeInTheDocument();
    expect(screen.getByText("Lightness")).toBeInTheDocument();
    expect(screen.getByText("260°")).toBeInTheDocument();
  });

  it("writes the colour in every notation", () => {
    render(<ColourAtlasTool />);
    for (const label of ["HEX", "RGB", "HSL", "OKLCH", "Display P3"]) {
      expect(
        screen.getByRole("button", { name: `Copy ${label}` }),
      ).toBeInTheDocument();
    }
  });

  it("shows shades, harmonies, contrast and colour vision", () => {
    render(<ColourAtlasTool />);
    const shades = screen.getByRole("region", { name: "Tints and shades" });
    expect(within(shades).getAllByRole("button")).toHaveLength(11);
    expect(
      screen.getByRole("region", { name: "Complementary" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Monochromatic" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("On white")).toBeInTheDocument();
    const vision = screen.getByRole("region", { name: "Colour vision" });
    expect(within(vision).queryByText("Normal")).not.toBeInTheDocument();
  });

  it("redraws everything for a newly typed colour", async () => {
    const user = userEvent.setup();
    render(<ColourAtlasTool />);
    const field = screen.getByRole("textbox", { name: "Colour" });
    await user.clear(field);
    await user.type(field, "#ff0000");
    expect(screen.getByText("red")).toBeInTheDocument();
  });
});
