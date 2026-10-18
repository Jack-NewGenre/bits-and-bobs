import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemePicker } from "@/components/molecules/theme-picker";

const setTheme = vi.fn();
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "green", setTheme }),
}));

function renderPicker() {
  return render(
    <TooltipProvider>
      <ThemePicker />
    </TooltipProvider>,
  );
}

describe("ThemePicker", () => {
  it("shows a swatch for every theme, plus system", () => {
    renderPicker();
    for (const label of ["Light", "Dark", "Green", "Blue", "System"]) {
      expect(
        screen.getByRole("radio", { name: `${label} theme` }),
      ).toBeInTheDocument();
    }
  });

  it("marks the current theme as chosen", () => {
    renderPicker();
    expect(screen.getByRole("radio", { name: "Green theme" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "Blue theme" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("switches theme when a swatch is clicked", () => {
    renderPicker();
    fireEvent.click(screen.getByRole("radio", { name: "Blue theme" }));
    expect(setTheme).toHaveBeenCalledWith("blue");
  });

  it("paints each swatch in its own theme", () => {
    const { container } = renderPicker();
    expect(container.querySelector(".bg-mat.dark")).not.toBeNull();
    expect(container.querySelector(".bg-mat.light")).not.toBeNull();
  });
});
