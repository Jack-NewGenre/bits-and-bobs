import { describe, expect, it } from "vitest";

import { exportFilename } from "@/lib/image/editor/canvas-io";

describe("exportFilename", () => {
  it("swaps the extension for the export format", () => {
    expect(exportFilename("holiday.png", "jpeg")).toBe("holiday.jpg");
    expect(exportFilename("Untitled", "webp")).toBe("Untitled.webp");
  });

  it("falls back to a default name", () => {
    expect(exportFilename("  ", "png")).toBe("image.png");
  });
});
