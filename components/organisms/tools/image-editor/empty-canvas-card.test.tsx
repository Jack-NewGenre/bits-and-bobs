import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EmptyCanvasCard } from "@/components/organisms/tools/image-editor/empty-canvas-card";

describe("EmptyCanvasCard", () => {
  it("offers a new canvas, an image or text", async () => {
    const user = userEvent.setup();
    const handlers = {
      onNewCanvas: vi.fn(),
      onAddImage: vi.fn(),
      onAddText: vi.fn(),
    };
    render(<EmptyCanvasCard {...handlers} />);

    await user.click(screen.getByRole("button", { name: "New canvas" }));
    await user.click(screen.getByRole("button", { name: "Add image" }));
    await user.click(screen.getByRole("button", { name: "Add text" }));

    expect(handlers.onNewCanvas).toHaveBeenCalledOnce();
    expect(handlers.onAddImage).toHaveBeenCalledOnce();
    expect(handlers.onAddText).toHaveBeenCalledOnce();
  });

  it("offers back the last session's work", async () => {
    const user = userEvent.setup();
    const handlers = {
      onNewCanvas: vi.fn(),
      onAddImage: vi.fn(),
      onAddText: vi.fn(),
    };
    const onRestore = vi.fn();
    const onDiscard = vi.fn();
    render(
      <EmptyCanvasCard
        {...handlers}
        savedName="Holiday"
        onRestore={onRestore}
        onDiscard={onDiscard}
      />,
    );

    expect(screen.getByText("Holiday")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Restore" }));
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(onRestore).toHaveBeenCalledOnce();
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("says nothing about a session when there is none", () => {
    render(
      <EmptyCanvasCard
        onNewCanvas={vi.fn()}
        onAddImage={vi.fn()}
        onAddText={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Restore" }),
    ).not.toBeInTheDocument();
  });
});
