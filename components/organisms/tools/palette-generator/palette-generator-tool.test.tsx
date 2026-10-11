import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HARMONIES } from "@/lib/colour/colour-harmony";
import { PaletteGeneratorTool } from "@/components/organisms/tools/palette-generator/palette-generator-tool";

const swatches = () =>
  screen
    .getAllByRole("button")
    .filter((button) =>
      button.getAttribute("aria-label")?.startsWith("Copy #"),
    );

describe("PaletteGeneratorTool", () => {
  it("offers every harmony", () => {
    render(<PaletteGeneratorTool />);
    for (const harmony of HARMONIES) {
      expect(
        screen.getByRole("button", { name: harmony.label }),
      ).toBeInTheDocument();
    }
  });

  it("starts on complementary, with two swatches", () => {
    render(<PaletteGeneratorTool />);
    expect(
      screen.getByRole("button", { name: "Complementary" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(swatches()).toHaveLength(2);
  });

  it("changes the palette when a different harmony is chosen", async () => {
    const user = userEvent.setup();
    render(<PaletteGeneratorTool />);

    await user.click(screen.getByRole("button", { name: "Triadic" }));
    expect(swatches()).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "Analogous" }));
    expect(swatches()).toHaveLength(5);
  });

  it("explains what the chosen harmony is for", async () => {
    const user = userEvent.setup();
    render(<PaletteGeneratorTool />);

    expect(screen.getByText(/maximum contrast/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Monochromatic" }));
    expect(
      screen.getByText(/quiet and unmistakably one family/i),
    ).toBeInTheDocument();
  });

  it("rebuilds the palette from a new base colour", async () => {
    const user = userEvent.setup();
    render(<PaletteGeneratorTool />);

    const before = swatches()[0].getAttribute("aria-label");
    const field = screen.getByLabelText("Base colour");
    await user.clear(field);
    await user.paste("#ff0000");

    expect(swatches()[0].getAttribute("aria-label")).not.toBe(before);
    expect(swatches()[0]).toHaveAttribute("aria-label", "Copy #ff0000");
  });

  it("shuffles to a new palette but keeps a locked colour", async () => {
    const user = userEvent.setup();
    render(<PaletteGeneratorTool />);

    const [base, complement] = swatches().map((swatch) =>
      swatch.getAttribute("aria-label"),
    );
    await user.click(screen.getByRole("button", { name: "Lock colour 2" }));
    await user.click(screen.getByRole("button", { name: "Shuffle" }));

    const after = swatches().map((swatch) => swatch.getAttribute("aria-label"));
    expect(after[0]).not.toBe(base);
    expect(after[1]).toBe(complement);
    expect(
      screen.getByRole("button", { name: "Unlock colour 2" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("drops the locks when the harmony changes", async () => {
    const user = userEvent.setup();
    render(<PaletteGeneratorTool />);

    await user.click(screen.getByRole("button", { name: "Lock colour 2" }));
    await user.click(screen.getByRole("button", { name: "Triadic" }));

    expect(
      screen.queryByRole("button", { name: /^Unlock/ }),
    ).not.toBeInTheDocument();
  });
});
