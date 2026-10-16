import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DimensionLine } from "@/components/atoms/dimension-line";

describe("DimensionLine", () => {
  it("shows its label between the measure lines", () => {
    render(<DimensionLine label="1920 × 1080 px" className="mt-2" />);
    const label = screen.getByText("1920 × 1080 px");
    expect(label.parentElement).toHaveClass("mt-2");
    expect(label.parentElement?.querySelectorAll("[aria-hidden]")).toHaveLength(
      4,
    );
  });
});
