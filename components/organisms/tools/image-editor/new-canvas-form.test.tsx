import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NewCanvasForm } from "@/components/organisms/tools/image-editor/new-canvas-form";

describe("NewCanvasForm", () => {
  it("creates a blank canvas from a preset", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<NewCanvasForm onCreate={onCreate} />);

    await user.click(screen.getByRole("button", { name: /HD/ }));
    await user.click(screen.getByRole("button", { name: "Create canvas" }));
    expect(onCreate).toHaveBeenCalledWith({
      width: 1920,
      height: 1080,
      background: "#ffffff",
    });
  });

  it("creates a transparent canvas at a custom size", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<NewCanvasForm onCreate={onCreate} />);

    const width = screen.getByLabelText("width");
    await user.clear(width);
    await user.type(width, "640");
    await user.click(screen.getByRole("button", { name: "Transparent" }));
    await user.click(screen.getByRole("button", { name: "Create canvas" }));
    expect(onCreate).toHaveBeenCalledWith({
      width: 640,
      height: 1080,
      background: null,
    });
  });
});
