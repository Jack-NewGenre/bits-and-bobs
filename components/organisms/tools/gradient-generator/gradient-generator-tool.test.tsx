import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GradientGeneratorTool } from "@/components/organisms/tools/gradient-generator/gradient-generator-tool";

const css = () => screen.getByText(/^background-image:/).textContent ?? "";

describe("GradientGeneratorTool", () => {
  it("starts on a two stop linear gradient in OKLab", () => {
    render(<GradientGeneratorTool />);
    expect(css()).toContain(
      "linear-gradient(90deg in oklab, #3b82f6 0%, #ec4899 100%)",
    );
  });

  it("hides the angle for a radial gradient", async () => {
    const user = userEvent.setup();
    render(<GradientGeneratorTool />);
    await user.click(screen.getByRole("button", { name: "Radial" }));
    expect(css()).toContain("radial-gradient(circle in oklab");
    expect(screen.queryByText("Angle")).not.toBeInTheDocument();
  });

  it("uses the angle as the start of a conic gradient", async () => {
    const user = userEvent.setup();
    render(<GradientGeneratorTool />);
    await user.click(screen.getByRole("button", { name: "Conic" }));
    expect(css()).toContain("conic-gradient(from 90deg in oklab");
    expect(screen.getByText("Start angle")).toBeInTheDocument();
  });

  it("adds a stop in the middle and removes it again", async () => {
    const user = userEvent.setup();
    render(<GradientGeneratorTool />);
    expect(
      screen.getByRole("button", { name: "Remove stop 1" }),
    ).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Add stop/ }));
    expect(css()).toMatch(/ 50%, /);
    expect(screen.getByRole("button", { name: "Remove stop 3" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Remove stop 3" }));
    expect(css()).not.toMatch(/ 50%/);
  });

  it("rolls a random gradient of the same kind", async () => {
    const user = userEvent.setup();
    render(<GradientGeneratorTool />);
    const before = css();
    await user.click(screen.getByRole("button", { name: /Random/ }));
    expect(css()).not.toBe(before);
    expect(css()).toContain("linear-gradient(");
  });
});
