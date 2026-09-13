import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OptionGroup } from "@/components/molecules/option-group";

const CHOICES = [
  { value: "square", label: "Square" },
  { value: "dot", label: "Dot" },
] as const;

describe("OptionGroup", () => {
  it("marks only the chosen pill as pressed", () => {
    render(
      <OptionGroup
        label="Shape"
        choices={CHOICES}
        value="dot"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Dot" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Square" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports the value behind the pill that was clicked", async () => {
    const onChange = vi.fn();
    render(
      <OptionGroup
        label="Shape"
        choices={CHOICES}
        value="dot"
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Square" }));

    expect(onChange).toHaveBeenCalledWith("square");
  });

  it("shows the hint only when there is one", () => {
    const { rerender } = render(
      <OptionGroup
        label="Shape"
        choices={CHOICES}
        value="dot"
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText("Pick carefully")).toBeNull();

    rerender(
      <OptionGroup
        label="Shape"
        choices={CHOICES}
        value="dot"
        onChange={vi.fn()}
        hint="Pick carefully"
      />,
    );
    expect(screen.getByText("Pick carefully")).toBeInTheDocument();
  });

  it("disables every pill when disabled", () => {
    render(
      <OptionGroup
        label="Shape"
        choices={CHOICES}
        value="dot"
        onChange={vi.fn()}
        disabled
      />,
    );

    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });
});
