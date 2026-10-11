import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { PixelSource } from "@/lib/image/pixel-sample";
import { PixelPickerTool } from "@/components/organisms/tools/pixel-picker/pixel-picker-tool";

/** A 2×1 image: red on the left, blue on the right. */
const SOURCE: PixelSource = {
  data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]),
  width: 2,
  height: 1,
};

vi.mock("@/lib/image/pixel-sample", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/image/pixel-sample")>()),
  decodePixels: vi.fn(async () => ({ ...SOURCE, bitmap: {} })),
}));

async function loadImage() {
  const user = userEvent.setup();
  render(<PixelPickerTool />);
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("No file input");
  await user.upload(input, new File(["x"], "photo.png", { type: "image/png" }));
  return {
    user,
    canvas: await screen.findByLabelText(/Move with the arrow keys/),
  };
}

/** Lays the canvas out as a box of the given size, which jsdom never does. */
function sizeBox(canvas: HTMLElement, width: number, height: number) {
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, width, height),
  );
  Object.defineProperties(canvas, {
    clientWidth: { value: width, configurable: true },
    clientHeight: { value: height, configurable: true },
  });
}

describe("PixelPickerTool", () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
  });

  it("asks for an image first", () => {
    render(<PixelPickerTool />);
    expect(screen.getByText(/Drop an image here/)).toBeInTheDocument();
  });

  it("picks colours with the keyboard", async () => {
    const { user, canvas } = await loadImage();
    canvas.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Picked")).toBeInTheDocument();
    expect(screen.getAllByText("#0000ff").length).toBeGreaterThan(0);

    await user.keyboard("{ArrowLeft}{Enter}");
    expect(screen.getAllByText("#ff0000").length).toBeGreaterThan(0);
  });

  it("shows the hovered colour under the pointer", async () => {
    const { canvas } = await loadImage();
    sizeBox(canvas, 200, 100);
    fireEvent.pointerMove(canvas, { clientX: 10, clientY: 50 });
    expect(screen.getByText("#ff0000")).toBeInTheDocument();
  });

  it("ignores the empty bands beside an image narrower than its box", async () => {
    const { canvas } = await loadImage();
    // The 2×1 image is drawn 200×100 in the middle of a 400×100 box.
    sizeBox(canvas, 400, 100);
    fireEvent.pointerMove(canvas, { clientX: 50, clientY: 50 });
    expect(screen.queryByText("#ff0000")).not.toBeInTheDocument();
    fireEvent.pointerMove(canvas, { clientX: 290, clientY: 50 });
    expect(screen.getByText("#0000ff")).toBeInTheDocument();
  });

  it("clears the picked colours and loads a new image", async () => {
    const { user, canvas } = await loadImage();
    canvas.focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: /Clear/ }));
    expect(screen.queryByText("Picked")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /New image/ }));
    expect(screen.getByText(/Drop an image here/)).toBeInTheDocument();
  });
});
