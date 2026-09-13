import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ColourConverterTool } from "@/components/tools/colour-converter/colour-converter-tool";

describe("ColourConverterTool", () => {
  it("shows the colour in every supported format", () => {
    render(<ColourConverterTool />);

    for (const label of ["HEX", "RGB", "HSL", "OKLCH"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("rgb(59 130 246)")).toBeInTheDocument();
  });

  it("reconverts everything from a newly typed colour", async () => {
    const user = userEvent.setup();
    render(<ColourConverterTool />);

    const field = screen.getByLabelText("Colour");
    await user.clear(field);
    await user.paste("#ff0000");

    expect(screen.getByText("rgb(255 0 0)")).toBeInTheDocument();
    expect(screen.getByText("hsl(0 100% 50%)")).toBeInTheDocument();
    expect(screen.getByText(/^oklch\(/)).toBeInTheDocument();
  });

  it("accepts a value in one format and reports it in the others", async () => {
    const user = userEvent.setup();
    render(<ColourConverterTool />);

    const field = screen.getByLabelText("Colour");
    await user.clear(field);
    await user.paste("hsl(120 100% 50%)");

    expect(screen.getByText("rgb(0 255 0)")).toBeInTheDocument();
    expect(screen.getAllByText("#00ff00").length).toBeGreaterThan(0);
  });

  it("reports contrast against white and black", () => {
    render(<ColourConverterTool />);
    expect(screen.getByText(/Contrast against white/)).toBeInTheDocument();
    expect(screen.getByText(/against black/)).toBeInTheDocument();
  });

  it("gives each format its own copy button", () => {
    render(<ColourConverterTool />);
    for (const label of ["HEX", "RGB", "HSL", "OKLCH"]) {
      expect(
        screen.getByRole("button", { name: `Copy ${label}` }),
      ).toBeInTheDocument();
    }
  });
});
