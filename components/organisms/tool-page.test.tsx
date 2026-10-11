import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { createToolPage } from "@/components/organisms/tool-page";
import { TOOLS, getAvailableTool } from "@/lib/tools";

describe("createToolPage", () => {
  const tool = getAvailableTool("uuid");

  it("titles the page with the tool's name and its card copy", () => {
    const { metadata } = createToolPage("uuid", null);
    expect(metadata.title).toBe(tool.name);
    expect(metadata.description).toBe(tool.description);
  });

  it("marks the tool's own route as canonical", () => {
    const { metadata } = createToolPage("uuid", null);
    expect(metadata.alternates?.canonical).toBe(tool.href);
  });

  it("renders the heading, the page copy and the tool itself", () => {
    const { Page } = createToolPage("uuid", <p>tool body</p>);
    render(<Page />);

    expect(
      screen.getByRole("heading", { level: 1, name: tool.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(tool.blurb)).toBeInTheDocument();
    expect(screen.getByText("tool body")).toBeInTheDocument();
  });

  it("refuses to build a page for a tool that is not available", () => {
    const planned = TOOLS.find((entry) => entry.status === "soon");
    if (planned) {
      expect(() => createToolPage(planned.slug, null)).toThrow(/marked "soon"/);
    }
    expect(() => createToolPage("nope", null)).toThrow(/No tool is registered/);
  });
});

describe("createToolPage for a full-screen tool", () => {
  it("renders the tool without the page shell, keeping a hidden heading", () => {
    const { Page } = createToolPage("image-editor", <p>editor body</p>);
    render(<Page />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Photo Studio" }),
    ).toHaveClass("sr-only");
    expect(screen.getByText("editor body")).toBeInTheDocument();
    expect(
      screen.queryByText(getAvailableTool("image-editor").blurb),
    ).not.toBeInTheDocument();
  });
});
