import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ListHeader } from "@/components/molecules/list-header";

describe("ListHeader", () => {
  it("shows the count beside the title when given one", () => {
    render(<ListHeader title="Queue" count={3} onClear={vi.fn()} />);
    expect(screen.getByRole("heading")).toHaveTextContent("Queue(3)");
  });

  it("shows the title alone when there is no count", () => {
    render(<ListHeader title="Document" onClear={vi.fn()} />);
    expect(screen.getByRole("heading")).toHaveTextContent("Document");
    expect(screen.getByRole("heading").textContent).not.toContain("(");
  });

  it("reports a clear", async () => {
    const onClear = vi.fn();
    render(<ListHeader title="Queue" count={2} onClear={onClear} />);

    await userEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(onClear).toHaveBeenCalledOnce();
  });
});
