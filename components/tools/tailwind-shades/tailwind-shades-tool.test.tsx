import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SHADE_STEPS } from "@/lib/colour-harmony";
import { TailwindShadesTool } from "@/components/tools/tailwind-shades/tailwind-shades-tool";

describe("TailwindShadesTool", () => {
  it("renders one swatch per step in the scale", () => {
    render(<TailwindShadesTool />);
    const swatches = screen
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-label")?.startsWith("Copy #"));
    expect(swatches).toHaveLength(SHADE_STEPS.length);
  });

  it("emits a Tailwind v4 theme block by default", () => {
    render(<TailwindShadesTool />);
    const output = screen.getByText(/@theme/);

    expect(output.textContent).toContain("--color-brand-50:");
    expect(output.textContent).toContain("--color-brand-950:");
    expect(output.textContent).toContain("oklch(");
  });

  it("switches to a plain hex object", async () => {
    const user = userEvent.setup();
    render(<TailwindShadesTool />);

    await user.click(screen.getByRole("button", { name: "Hex object" }));

    expect(screen.getByText(/brand: \{/).textContent).toContain('500: "#');
    expect(screen.queryByText(/@theme/)).not.toBeInTheDocument();
  });

  it("uses the scale name in the output and makes it CSS-safe", async () => {
    const user = userEvent.setup();
    render(<TailwindShadesTool />);

    const name = screen.getByLabelText("Scale name");
    await user.clear(name);
    await user.paste("My Brand!");

    expect(screen.getByText(/@theme/).textContent).toContain(
      "--color-my-brand-50:",
    );
  });

  it("falls back to a usable name when the field is emptied", async () => {
    const user = userEvent.setup();
    render(<TailwindShadesTool />);

    await user.clear(screen.getByLabelText("Scale name"));
    expect(screen.getByText(/@theme/).textContent).toContain(
      "--color-brand-500:",
    );
  });

  it("marks the step the chosen colour landed on", () => {
    render(<TailwindShadesTool />);
    expect(screen.getByText(/●/)).toBeInTheDocument();
  });
});
