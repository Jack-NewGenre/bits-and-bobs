import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DEFAULT_STICKER_SETTINGS } from "@/lib/image/sticker";
import { StickerOptions } from "@/components/organisms/tools/sticker-maker/sticker-options";

describe("StickerOptions", () => {
  it("switches the border to black", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StickerOptions
        settings={DEFAULT_STICKER_SETTINGS}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Black" }));

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_STICKER_SETTINGS,
      borderColour: { r: 0, g: 0, b: 0, a: 1 },
    });
  });

  it("reveals a colour field for a custom border without changing it yet", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StickerOptions
        settings={DEFAULT_STICKER_SETTINGS}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Custom" }));

    expect(screen.getByText("Custom colour")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("opens on custom when the border is not a preset", () => {
    render(
      <StickerOptions
        settings={{
          ...DEFAULT_STICKER_SETTINGS,
          borderColour: { r: 255, g: 0, b: 0, a: 1 },
        }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Custom colour")).toBeInTheDocument();
  });

  it("turns the shadow off", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StickerOptions
        settings={DEFAULT_STICKER_SETTINGS}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Off" }));

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_STICKER_SETTINGS,
      shadow: false,
    });
  });

  it("keeps the whole picture when the background is kept", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StickerOptions
        settings={DEFAULT_STICKER_SETTINGS}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Keep" }));

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_STICKER_SETTINGS,
      removeBackground: false,
    });
  });
});
