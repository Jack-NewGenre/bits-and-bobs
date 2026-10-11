import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { Mascot, REACTION_MS } from "@/components/atoms/mascot";
import { GAZE_REACH } from "@/hooks/use-pointer-gaze";

const stubMotion = (reduced: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("reduce"),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

const movePointer = (clientX: number, clientY: number) =>
  fireEvent(window, Object.assign(new Event("pointermove"), { clientX, clientY }));

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const mascot = () => screen.getByRole("button", { name: "Poke the mascot" });

describe("Mascot", () => {
  it("looks towards the pointer", () => {
    stubMotion(false);
    render(<Mascot />);
    movePointer(GAZE_REACH, 0);
    expect(mascot().style.getPropertyValue("--gaze-x")).toBe("1.000");
    expect(mascot().style.getPropertyValue("--gaze-y")).toBe("0.000");
  });

  it("looks back to centre when the pointer leaves the window", () => {
    stubMotion(false);
    render(<Mascot />);
    movePointer(0, GAZE_REACH / 2);
    expect(mascot().style.getPropertyValue("--gaze-y")).toBe("0.500");
    fireEvent(window, new Event("blur"));
    expect(mascot().style.getPropertyValue("--gaze-y")).toBe("0.000");
  });

  it("stays still when motion is reduced", () => {
    stubMotion(true);
    render(<Mascot />);
    movePointer(GAZE_REACH, GAZE_REACH);
    expect(mascot().style.getPropertyValue("--gaze-x")).toBe("");
  });

  it("reacts differently to each poke, then settles", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    stubMotion(false);
    render(<Mascot />);
    expect(mascot()).not.toHaveAttribute("data-reaction");

    fireEvent.click(mascot());
    expect(mascot()).toHaveAttribute("data-reaction", "bounce");
    expect(mascot()).toHaveAttribute("data-eyes", "happy");
    expect(screen.getByRole("status")).toHaveTextContent("Boing!");

    fireEvent.click(mascot());
    expect(mascot()).toHaveAttribute("data-reaction", "spin");
    expect(mascot()).toHaveAttribute("data-eyes", "excited");
    expect(screen.getByRole("status")).toHaveTextContent("Wheee!");

    act(() => vi.advanceTimersByTime(REACTION_MS));
    expect(mascot()).not.toHaveAttribute("data-reaction");
    expect(mascot()).not.toHaveAttribute("data-eyes");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});
