import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { FileSummary } from "@/components/molecules/file-summary";

describe("FileSummary", () => {
  it("reads as one line of plain facts", () => {
    render(
      <FileSummary
        label="Output"
        width={1920}
        height={1080}
        type="image/jpeg"
        bytes={2048}
      />,
    );
    expect(
      screen.getByText("Output: 1920 × 1080 · JPG · 2.0 KB"),
    ).toBeInTheDocument();
  });

  it("leaves out facts it does not have yet", () => {
    render(<FileSummary label="Input" type="image/png" bytes={512} />);
    expect(screen.getByText("Input: PNG · 512 B")).toBeInTheDocument();
  });

  it("appends an extra fact when given one", () => {
    render(
      <FileSummary label="Output" bytes={1024} extra="41% of the area removed" />,
    );
    expect(
      screen.getByText("Output: 1.0 KB · 41% of the area removed"),
    ).toBeInTheDocument();
  });

  it("renders nothing when there is nothing to say", () => {
    const { container } = render(<FileSummary label="Input" />);
    expect(container).toBeEmptyDOMElement();
  });
});
