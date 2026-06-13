import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom lacks ResizeObserver, which several Radix UI primitives rely on.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??=
  ResizeObserverStub as unknown as typeof ResizeObserver;

afterEach(() => {
  cleanup();
});
