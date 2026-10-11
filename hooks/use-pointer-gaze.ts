"use client";

import { useEffect, type RefObject } from "react";

import { gazeToward } from "@/lib/gaze";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** How far, in pixels, the pointer has to be before the gaze is at full strength. */
export const GAZE_REACH = 480;

/**
 * Follows the pointer anywhere on the page and writes where `ref` should look
 * into its `--gaze-x` and `--gaze-y` custom properties, each between -1 and 1.
 * Styles read those, so tracking never re-renders React. Stays still for
 * reduced motion, and looks back to centre when the pointer leaves the window.
 */
export function usePointerGaze(ref: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element || reduced) return;

    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    const write = (x: number, y: number) => {
      element.style.setProperty("--gaze-x", x.toFixed(3));
      element.style.setProperty("--gaze-y", y.toFixed(3));
    };

    const update = () => {
      frame = 0;
      if (!pointer) return write(0, 0);
      const rect = element.getBoundingClientRect();
      const gaze = gazeToward(
        pointer.x - (rect.left + rect.width / 2),
        pointer.y - (rect.top + rect.height / 2),
        GAZE_REACH
      );
      write(gaze.x, gaze.y);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const onMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    };

    const onLeave = () => {
      pointer = null;
      schedule();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", onLeave);
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", onLeave);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      element.style.removeProperty("--gaze-x");
      element.style.removeProperty("--gaze-y");
    };
  }, [ref, reduced]);
}
