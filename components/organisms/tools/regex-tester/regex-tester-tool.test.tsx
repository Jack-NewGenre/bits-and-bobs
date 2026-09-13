import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RegexTesterTool } from "@/components/organisms/tools/regex-tester/regex-tester-tool";

async function setPattern(value: string) {
  const user = userEvent.setup();
  const field = screen.getByLabelText("Pattern");
  await user.clear(field);
  if (value) await user.paste(value);
}

const marks = () => document.querySelectorAll("mark");

/** Matching is asynchronous, so every assertion waits for it to land. */
const expectMarks = (count: number) =>
  waitFor(() => expect(marks()).toHaveLength(count));

describe("RegexTesterTool", () => {
  it("highlights every match in the sample text", async () => {
    render(<RegexTesterTool />);
    await expectMarks(3);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("re-runs as the pattern changes", async () => {
    render(<RegexTesterTool />);
    await setPattern("Ada");
    await expectMarks(1);
  });

  it("reports an invalid pattern rather than breaking", async () => {
    render(<RegexTesterTool />);
    await setPattern("(unclosed");

    await waitFor(() =>
      expect(screen.getByLabelText("Pattern")).toHaveAttribute(
        "aria-invalid",
        "true",
      ),
    );
    expect(marks()).toHaveLength(0);
  });

  it("finds only the first match once the global flag is off", async () => {
    const user = userEvent.setup();
    render(<RegexTesterTool />);

    await user.click(screen.getByRole("button", { name: "g" }));
    await expectMarks(1);
  });

  it("lists the captures for each match", async () => {
    render(<RegexTesterTool />);
    expect(await screen.findByText("Captures")).toBeInTheDocument();
    // The matched text appears in both the highlight and the captures list.
    expect(screen.getAllByText("ada@example.com")).toHaveLength(2);
    expect(screen.getByText("ada")).toBeInTheDocument();
    expect(screen.getByText("at 14")).toBeInTheDocument();
  });

  it("applies a replacement template", async () => {
    const user = userEvent.setup();
    render(<RegexTesterTool />);

    await user.click(screen.getByLabelText("Replace with"));
    await user.paste("$1 at $2");
    expect(await screen.findByText(/ada at example\.com/)).toBeInTheDocument();
  });

  it("shows nothing at all for an empty pattern", async () => {
    render(<RegexTesterTool />);
    await setPattern("");
    await expectMarks(0);
    expect(screen.queryByText("Captures")).not.toBeInTheDocument();
  });
});
