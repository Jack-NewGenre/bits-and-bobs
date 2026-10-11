import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { LayerSummary } from "@/lib/image/editor/layers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LayersPanel } from "@/components/organisms/tools/image-editor/layers-panel";

const LAYERS: LayerSummary[] = [
  {
    id: "a",
    name: "Title",
    kind: "text",
    visible: true,
    locked: false,
    selected: true,
    masked: false,
    clipped: false,
  },
  {
    id: "b",
    name: "Photo",
    kind: "image",
    visible: false,
    locked: true,
    selected: false,
    masked: false,
    clipped: false,
  },
];

function setup(layers = LAYERS, thumbnails?: Record<string, string>) {
  const handlers = {
    onSelect: vi.fn(),
    onToggleVisible: vi.fn(),
    onToggleLocked: vi.fn(),
    onRename: vi.fn(),
    onMove: vi.fn(),
    onArrange: vi.fn(),
    onCreate: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <TooltipProvider>
      <LayersPanel layers={layers} thumbnails={thumbnails} {...handlers} />
    </TooltipProvider>,
  );
  return handlers;
}

describe("LayersPanel", () => {
  it("creates a new layer, even with nothing selected", async () => {
    const user = userEvent.setup();
    const { onCreate } = setup([]);
    await user.click(screen.getByRole("button", { name: "New layer" }));
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it("shows a preview for layers that have one", () => {
    setup(LAYERS, { a: "data:image/png;base64,AAAA" });
    const previews = document.querySelectorAll("li img");
    expect(previews).toHaveLength(1);
    expect(previews[0]).toHaveAttribute("src", "data:image/png;base64,AAAA");
  });

  it("lists layers and marks the selected one", () => {
    setup();
    expect(screen.getByRole("button", { name: "Title" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Photo" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("selects, adding to the selection with shift", async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();
    await user.click(screen.getByRole("button", { name: "Photo" }));
    expect(onSelect).toHaveBeenLastCalledWith("b", false);
    await user.keyboard("{Shift>}");
    await user.click(screen.getByRole("button", { name: "Photo" }));
    expect(onSelect).toHaveBeenLastCalledWith("b", true);
  });

  it("toggles visibility and lock", async () => {
    const user = userEvent.setup();
    const { onToggleVisible, onToggleLocked } = setup();
    await user.click(screen.getByRole("button", { name: "Show layer" }));
    await user.click(screen.getByRole("button", { name: "Unlock layer" }));
    expect(onToggleVisible).toHaveBeenCalledWith("b");
    expect(onToggleLocked).toHaveBeenCalledWith("b");
  });

  it("renames a layer on double click", async () => {
    const user = userEvent.setup();
    const { onRename } = setup();
    await user.dblClick(screen.getByRole("button", { name: "Title" }));
    const input = screen.getByRole("textbox", { name: "Layer name" });
    await user.clear(input);
    await user.type(input, "Heading{Enter}");
    expect(onRename).toHaveBeenCalledWith("a", "Heading");
  });

  it("disables layer actions with nothing selected", () => {
    setup(
      LAYERS.map((layer) => ({
        ...layer,
        selected: false,
        masked: false,
        clipped: false,
      })),
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Duplicate" })).toBeDisabled();
  });

  it("explains the empty state", () => {
    setup([]);
    expect(screen.getByText(/No layers yet/)).toBeInTheDocument();
  });
});
