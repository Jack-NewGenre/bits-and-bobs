import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MaskPanel } from "@/components/organisms/tools/image-editor/mask-panel";

function setup(
  props: { masked?: boolean; clipped?: boolean; fromSelection?: boolean } = {},
) {
  const handlers = {
    onAddMask: vi.fn(),
    onApplyMask: vi.fn(),
    onDeleteMask: vi.fn(),
    onToggleClipping: vi.fn(),
  };
  render(
    <MaskPanel
      masked={false}
      clipped={false}
      fromSelection={false}
      {...props}
      {...handlers}
    />,
  );
  return handlers;
}

describe("MaskPanel", () => {
  it("adds a mask, from the selection when there is one", async () => {
    const user = userEvent.setup();
    const { onAddMask } = setup({ fromSelection: true });
    await user.click(screen.getByRole("button", { name: "Mask to selection" }));
    expect(onAddMask).toHaveBeenCalledOnce();
  });

  it("applies or deletes an existing mask", async () => {
    const user = userEvent.setup();
    const { onApplyMask, onDeleteMask } = setup({ masked: true });
    expect(
      screen.queryByRole("button", { name: "Add layer mask" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onApplyMask).toHaveBeenCalledOnce();
    expect(onDeleteMask).toHaveBeenCalledOnce();
  });

  it("toggles clipping, showing whether it is on", async () => {
    const user = userEvent.setup();
    const { onToggleClipping } = setup({ clipped: true });
    const button = screen.getByRole("button", {
      name: "Release clipping mask",
    });
    expect(button).toHaveAttribute("aria-pressed", "true");
    await user.click(button);
    expect(onToggleClipping).toHaveBeenCalledOnce();
  });
});
