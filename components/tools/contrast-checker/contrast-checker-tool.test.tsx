import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ContrastCheckerTool } from "@/components/tools/contrast-checker/contrast-checker-tool";

async function setColour(label: string, value: string) {
  const user = userEvent.setup();
  const field = screen.getByLabelText(label);
  await user.clear(field);
  await user.paste(value);
}

describe("ContrastCheckerTool", () => {
  it("reports the ratio and grade for the current pair", async () => {
    render(<ContrastCheckerTool />);
    await setColour("Text", "#000000");

    expect(screen.getByText("21.00:1")).toBeInTheDocument();
    expect(screen.getByText("AAA")).toBeInTheDocument();
  });

  it("fails a pair with no contrast at all", async () => {
    render(<ContrastCheckerTool />);
    await setColour("Text", "#ffffff");

    expect(screen.getByText("1.00:1")).toBeInTheDocument();
    expect(screen.getByText("Fail")).toBeInTheDocument();
  });

  it("distinguishes large text from body text in the middle band", async () => {
    render(<ContrastCheckerTool />);
    await setColour("Text", "#949494");

    expect(screen.getByText("AA Large")).toBeInTheDocument();
  });

  it("lists every threshold with what it needs", () => {
    render(<ContrastCheckerTool />);

    for (const label of [
      "Body text (AA)",
      "Body text (AAA)",
      "Large text (AA)",
      "Large text (AAA)",
      "Icons & borders (AA)",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // 4.5:1 is both the body-AA and the large-AAA threshold.
    expect(screen.getAllByText("needs 4.5:1")).toHaveLength(2);
    expect(screen.getAllByText("needs 3:1")).toHaveLength(2);
  });

  it("swaps the two colours over", async () => {
    const user = userEvent.setup();
    render(<ContrastCheckerTool />);
    await setColour("Text", "#000000");

    await user.click(screen.getByRole("button", { name: "Swap" }));

    expect(screen.getByLabelText("Text")).toHaveValue("#ffffff");
    expect(screen.getByLabelText("Background")).toHaveValue("#000000");
    // The ratio is symmetric, so the verdict does not change.
    expect(screen.getByText("21.00:1")).toBeInTheDocument();
  });

  it("explains itself when the text is translucent", async () => {
    render(<ContrastCheckerTool />);
    await setColour("Text", "#00000080");

    expect(screen.getByText(/mixed onto the background first/i)).toBeInTheDocument();
  });
});
