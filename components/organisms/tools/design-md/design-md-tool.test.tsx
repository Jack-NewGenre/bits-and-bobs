import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesignMdTool } from "@/components/organisms/tools/design-md/design-md-tool";

const output = () => screen.getByLabelText("DESIGN.md output") as HTMLTextAreaElement;
const capture = () => screen.getByLabelText("Capture, CSS or HTML");

describe("DesignMdTool", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches a pasted URL into tokens, credited to that URL", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html><style>button { background: #ff0066; color: #fff }</style></html>")
        )
    );
    render(<DesignMdTool />);
    await user.type(screen.getByLabelText("Website URL"), "acme.test");
    await user.click(screen.getByRole("button", { name: "Fetch" }));
    await waitFor(() => expect(output().value).toContain('primary: "#ff0066"'));
    expect(output().value).toContain("acme.test");
  });

  it("shows why a fetch failed", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({ error: "Only public websites can be fetched." }, { status: 400 })
      )
    );
    render(<DesignMdTool />);
    await user.type(screen.getByLabelText("Website URL"), "localhost");
    await user.click(screen.getByRole("button", { name: "Fetch" }));
    expect(await screen.findByText("Only public websites can be fetched.")).toBeInTheDocument();
  });

  it("starts from the starter tokens", () => {
    render(<DesignMdTool />);
    expect(output().value).toContain("# Untitled design system");
    expect(output().value).toContain('primary: "#2563eb"');
  });

  it("puts the bookmarklet on the drag link", () => {
    render(<DesignMdTool />);
    const link = screen.getByText("Capture design").closest("a");
    expect(link?.getAttribute("href")).toMatch(/^javascript:/);
  });

  it("turns pasted CSS into tokens and markdown", async () => {
    render(<DesignMdTool />);
    fireEvent.change(capture(), {
      target: { value: ":root { --brand: #ff0066 } button { background: var(--brand); color: #fff }" },
    });
    expect(screen.getByText("CSS")).toBeInTheDocument();
    await waitFor(() => expect(output().value).toContain('"--brand": "#ff0066"'));
    expect(output().value).toContain('primary: "#ff0066"');
  });

  it("warns about stylesheets a pasted page links to", () => {
    render(<DesignMdTool />);
    fireEvent.change(capture(), {
      target: { value: '<html><head><link rel="stylesheet" href="a.css"></head></html>' },
    });
    expect(screen.getByText(/links 1 stylesheet that could not be read/)).toBeInTheDocument();
  });

  it("updates the markdown as tokens are edited", async () => {
    const user = userEvent.setup();
    render(<DesignMdTool />);
    await user.type(screen.getByLabelText("Name"), "Acme");
    await waitFor(() => expect(output().value).toContain("# Acme design system"));
    await user.click(screen.getByRole("button", { name: "Add shadow" }));
    await user.type(screen.getByLabelText("shadow 1 name"), "card");
    await user.type(screen.getByLabelText("shadow 1 value"), "0 1px 2px #000");
    await waitFor(() => expect(output().value).toContain("--card: 0 1px 2px #000;"));
  });
});
