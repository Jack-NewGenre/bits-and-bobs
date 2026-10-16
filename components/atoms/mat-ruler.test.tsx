import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MAT_UNIT, MatRuler } from "@/components/atoms/mat-ruler";

describe("MatRuler", () => {
  it("numbers every fifth grid line", () => {
    render(<MatRuler labels={3} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.queryByText("4")).not.toBeInTheDocument();
    expect(screen.queryByText("20")).not.toBeInTheDocument();
  });

  it("puts each number on its grid line, across the top", () => {
    render(<MatRuler labels={2} />);
    expect(screen.getByText("10")).toHaveStyle({ left: `${10 * MAT_UNIT}px` });
  });

  it("puts each number on its grid line, down the side when vertical", () => {
    render(<MatRuler labels={2} vertical />);
    expect(screen.getByText("10")).toHaveStyle({ top: `${10 * MAT_UNIT}px` });
  });
});
