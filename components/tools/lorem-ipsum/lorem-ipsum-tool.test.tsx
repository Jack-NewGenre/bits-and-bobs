import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LoremIpsumTool } from "@/components/tools/lorem-ipsum/lorem-ipsum-tool";

const output = () =>
  screen.getByLabelText<HTMLTextAreaElement>("Placeholder text");

/** The seed is drawn after hydration, so wait for the first real text. */
const ready = () => waitFor(() => expect(output().value).not.toBe(""));

describe("LoremIpsumTool", () => {
  it("opens with the familiar line", async () => {
    render(<LoremIpsumTool />);
    await ready();
    expect(output().value.startsWith("Lorem ipsum dolor sit amet")).toBe(true);
  });

  it("counts what it produced", async () => {
    render(<LoremIpsumTool />);
    await ready();
    expect(screen.getByText(/\d+ words · \d+ characters/)).toBeInTheDocument();
  });

  it("switches unit, and drops the opener on request", async () => {
    const user = userEvent.setup();
    render(<LoremIpsumTool />);
    await ready();

    await user.click(screen.getByRole("button", { name: "Words" }));
    await user.click(
      screen.getByRole("button", { name: /Lorem ipsum dolor sit amet/ }),
    );

    await waitFor(() =>
      expect(output().value.startsWith("Lorem ipsum")).toBe(false),
    );
  });

  it("offers the HTML wrapper only for paragraphs", async () => {
    const user = userEvent.setup();
    render(<LoremIpsumTool />);
    await ready();

    expect(screen.getByRole("button", { name: /Wrap in/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Words" }));
    expect(screen.queryByRole("button", { name: /Wrap in/ })).not.toBeInTheDocument();
  });

  it("wraps paragraphs in tags when asked", async () => {
    const user = userEvent.setup();
    render(<LoremIpsumTool />);
    await ready();

    await user.click(screen.getByRole("button", { name: /Wrap in/ }));
    await waitFor(() => expect(output().value).toContain("<p>"));
  });

  it("gives different text when shuffled", async () => {
    const user = userEvent.setup();
    render(<LoremIpsumTool />);
    await ready();

    const before = output().value;
    await user.click(screen.getByRole("button", { name: "Shuffle" }));
    await waitFor(() => expect(output().value).not.toBe(before));
  });
});
