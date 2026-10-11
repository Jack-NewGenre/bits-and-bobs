import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CropEditor } from "@/components/organisms/tools/favicon-generator/crop-editor";

const bounds = { width: 400, height: 200 };
const crop = { x: 100, y: 50, side: 100 };

/** The frame is 200px wide on screen, so every screen pixel is two source pixels. */
function setup() {
  const onChange = vi.fn();
  const { container } = render(
    <CropEditor
      src="blob:x"
      bounds={bounds}
      crop={crop}
      radius={0}
      onChange={onChange}
    />,
  );
  const frame = container.firstElementChild as HTMLDivElement;
  Object.defineProperty(frame, "clientWidth", { value: 200 });
  frame.setPointerCapture = vi.fn();
  return { onChange, frame, area: screen.getByRole("group") };
}

describe("CropEditor", () => {
  it("moves the crop when the box is dragged", () => {
    const { onChange, frame, area } = setup();

    fireEvent.pointerDown(area, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(frame, { clientX: 20, clientY: 15 });

    expect(onChange).toHaveBeenLastCalledWith({ x: 120, y: 60, side: 100 });
  });

  it("resizes from a corner, keeping the opposite corner fixed", () => {
    const { onChange, frame } = setup();
    const corner = frame.querySelector('[data-corner="nw"]')!;

    fireEvent.pointerDown(corner, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(frame, { clientX: -10, clientY: -10 });

    expect(onChange).toHaveBeenLastCalledWith({ x: 80, y: 30, side: 120 });
  });

  it("stops following the pointer once released", () => {
    const { onChange, frame, area } = setup();

    fireEvent.pointerDown(area, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(frame);
    fireEvent.pointerMove(frame, { clientX: 50, clientY: 50 });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("nudges with the arrow keys", () => {
    const { onChange, area } = setup();

    fireEvent.keyDown(area, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith({ x: 104, y: 50, side: 100 });

    fireEvent.keyDown(area, { key: "ArrowUp", shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith({ x: 100, y: 10, side: 100 });
  });
});
