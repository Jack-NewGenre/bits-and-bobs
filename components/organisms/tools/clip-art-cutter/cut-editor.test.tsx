import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCutRegions, type CutRegions } from "@/hooks/use-cut-regions";
import { CutEditor } from "@/components/organisms/tools/clip-art-cutter/cut-editor";

const bounds = { width: 400, height: 200 };

function Harness({ onCuts }: { onCuts: (cuts: CutRegions) => void }) {
  const cuts = useCutRegions();
  onCuts(cuts);
  return <CutEditor src="blob:sheet" bounds={bounds} cuts={cuts} />;
}

/**
 * Render the editor at half size on screen, so one screen pixel is two image
 * pixels, drawing with the lasso unless asked for boxes.
 */
function setup(mode: "Lasso" | "Box" = "Lasso") {
  let latest = {} as CutRegions;
  render(<Harness onCuts={(cuts) => (latest = cuts)} />);
  fireEvent.click(screen.getByRole("button", { name: mode }));
  const frame = screen.getByLabelText(/^Image\./);
  frame.setPointerCapture = vi.fn();
  vi.spyOn(frame, "getBoundingClientRect").mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 200, height: 100 }),
  );
  return { frame, cuts: () => latest };
}

const pointer = { button: 0, pointerId: 1 };

describe("CutEditor", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("draws with the lasso by default", () => {
    render(<Harness onCuts={() => undefined} />);
    expect(screen.getByLabelText(/lasso it/)).toBeInTheDocument();
  });

  it("lassoes a piece, keeping the outline relative to its box", () => {
    const { frame, cuts } = setup();

    fireEvent.pointerDown(frame, { ...pointer, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(frame, { ...pointer, clientX: 50, clientY: 10 });
    fireEvent.pointerMove(frame, { ...pointer, clientX: 30, clientY: 40 });
    fireEvent.pointerUp(frame, pointer);

    expect(cuts().regions).toEqual([
      {
        id: 1,
        x: 20,
        y: 20,
        width: 80,
        height: 60,
        path: [
          { x: 0, y: 0 },
          { x: 80, y: 0 },
          { x: 40, y: 60 },
        ],
      },
    ]);
  });

  it("ignores a lasso too small to be a cut", () => {
    const { frame, cuts } = setup();

    fireEvent.pointerDown(frame, { ...pointer, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(frame, { ...pointer, clientX: 11, clientY: 10 });
    fireEvent.pointerUp(frame, pointer);

    expect(cuts().regions).toEqual([]);
  });

  it("moves a lasso cut by its outline, with no resize corners", () => {
    const { frame, cuts } = setup();
    fireEvent.pointerDown(frame, { ...pointer, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(frame, { ...pointer, clientX: 50, clientY: 10 });
    fireEvent.pointerMove(frame, { ...pointer, clientX: 30, clientY: 40 });
    fireEvent.pointerUp(frame, pointer);

    const cut = screen.getByRole("group", { name: /^Piece 1/ });
    expect(cut.querySelector("[data-corner]")).toBeNull();
    fireEvent.pointerDown(cut.querySelector("polygon")!, {
      ...pointer,
      clientX: 30,
      clientY: 20,
    });
    fireEvent.pointerMove(frame, { ...pointer, clientX: 40, clientY: 25 });
    fireEvent.pointerUp(frame, pointer);

    expect(cuts().regions[0]).toMatchObject({
      x: 40,
      y: 30,
      width: 80,
      height: 60,
    });
    expect(cuts().regions[0].path?.[1]).toEqual({ x: 80, y: 0 });
  });

  it("draws a box in image pixels", () => {
    const { frame, cuts } = setup("Box");

    fireEvent.pointerDown(frame, { ...pointer, clientX: 10, clientY: 5 });
    fireEvent.pointerMove(frame, { ...pointer, clientX: 60, clientY: 45 });
    fireEvent.pointerUp(frame, pointer);

    expect(cuts().regions).toEqual([
      { id: 1, x: 20, y: 10, width: 100, height: 80 },
    ]);
  });

  it("ignores a click that draws nothing", () => {
    const { frame, cuts } = setup("Box");

    fireEvent.pointerDown(frame, { ...pointer, clientX: 10, clientY: 5 });
    fireEvent.pointerUp(frame, pointer);

    expect(cuts().regions).toEqual([]);
  });

  it("moves a box, and resizes it by a corner", () => {
    const { frame, cuts } = setup("Box");
    fireEvent.pointerDown(frame, { ...pointer, clientX: 10, clientY: 5 });
    fireEvent.pointerMove(frame, { ...pointer, clientX: 60, clientY: 45 });
    fireEvent.pointerUp(frame, pointer);

    const box = screen.getByRole("group", { name: /^Piece 1/ });
    fireEvent.pointerDown(box, { ...pointer, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(frame, { ...pointer, clientX: 30, clientY: 20 });
    fireEvent.pointerUp(frame, pointer);
    expect(cuts().regions[0]).toMatchObject({
      x: 40,
      y: 10,
      width: 100,
      height: 80,
    });

    const corner = box.querySelector<HTMLElement>('[data-corner="se"]')!;
    fireEvent.pointerDown(corner, { ...pointer, clientX: 70, clientY: 45 });
    fireEvent.pointerMove(frame, { ...pointer, clientX: 80, clientY: 50 });
    fireEvent.pointerUp(frame, pointer);
    expect(cuts().regions[0]).toMatchObject({
      x: 40,
      y: 10,
      width: 120,
      height: 90,
    });
  });
});
