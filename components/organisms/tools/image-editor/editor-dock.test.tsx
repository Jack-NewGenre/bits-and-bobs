import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TooltipProvider } from "@/components/ui/tooltip";
import {
  EditorDock,
  type EditorPanel,
} from "@/components/organisms/tools/image-editor/editor-dock";

function setup(panels: EditorPanel[] = ["layers"]) {
  const onToolChange = vi.fn();
  const onTogglePanel = vi.fn();
  const onColoursChange = vi.fn();
  render(
    <TooltipProvider>
      <EditorDock
        tool="brush"
        onToolChange={onToolChange}
        panels={new Set(panels)}
        onTogglePanel={onTogglePanel}
        colour="#ff0000"
        secondary="#0000ff"
        onColoursChange={onColoursChange}
      />
    </TooltipProvider>,
  );
  return { onToolChange, onTogglePanel, onColoursChange };
}

describe("EditorDock", () => {
  it("marks the active tool and switches tools", async () => {
    const user = userEvent.setup();
    const { onToolChange } = setup();
    expect(screen.getByRole("button", { name: "Brush" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Text" }));
    expect(onToolChange).toHaveBeenCalledWith("text");
  });

  it("shows each tool's shortcut letter", () => {
    setup();
    expect(screen.getByRole("button", { name: "Shape" })).toHaveTextContent(
      "U",
    );
    expect(
      screen.getByRole("button", { name: "Magic wand" }),
    ).toHaveTextContent("W");
  });

  it("swaps the main and second colours", async () => {
    const user = userEvent.setup();
    const { onColoursChange } = setup();
    await user.click(screen.getByRole("button", { name: "Swap colours" }));
    expect(onColoursChange).toHaveBeenCalledWith({
      colour: "#0000ff",
      secondary: "#ff0000",
    });
  });

  it("toggles panels, labelled by what a click will do", async () => {
    const user = userEvent.setup();
    const { onTogglePanel } = setup(["layers"]);
    await user.click(screen.getByRole("button", { name: "Hide layers" }));
    await user.click(screen.getByRole("button", { name: "Show canvas" }));
    expect(onTogglePanel).toHaveBeenNthCalledWith(1, "layers");
    expect(onTogglePanel).toHaveBeenNthCalledWith(2, "canvas");
  });
});
