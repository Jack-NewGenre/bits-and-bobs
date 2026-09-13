import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { JsonFormatterTool } from "@/components/organisms/tools/json-formatter/json-formatter-tool";

const input = () => screen.getByLabelText("JSON input");
const output = () => screen.getByLabelText<HTMLTextAreaElement>("JSON output");

async function type(value: string) {
  const user = userEvent.setup();
  await user.clear(input());
  await user.paste(value);
}

describe("JsonFormatterTool", () => {
  it("formats what you paste in", async () => {
    render(<JsonFormatterTool />);
    await type('{"a":1}');
    expect(output().value).toBe('{\n  "a": 1\n}');
  });

  it("switches to minifying", async () => {
    const user = userEvent.setup();
    render(<JsonFormatterTool />);
    await type('{\n  "a": 1\n}');

    await user.click(screen.getByRole("button", { name: "Minify" }));
    expect(output().value).toBe('{"a":1}');
    // The indent choice is meaningless when minifying, so it is hidden.
    expect(screen.queryByRole("button", { name: "2 spaces" })).not.toBeInTheDocument();
  });

  it("changes the indent", async () => {
    const user = userEvent.setup();
    render(<JsonFormatterTool />);
    await type('{"a":1}');

    await user.click(screen.getByRole("button", { name: "Tab" }));
    expect(output().value).toBe('{\n\t"a": 1\n}');
  });

  it("sorts keys on request", async () => {
    const user = userEvent.setup();
    render(<JsonFormatterTool />);
    await type('{"b":1,"a":2}');

    await user.click(screen.getByRole("button", { name: "Sort A–Z" }));
    expect(output().value.indexOf('"a"')).toBeLessThan(output().value.indexOf('"b"'));
  });

  it("points the error at a line instead of a character offset", async () => {
    render(<JsonFormatterTool />);
    await type('{\n  "a": 1,\n  oops\n}');

    expect(screen.getByText(/Line 3, column 3/)).toBeInTheDocument();
    expect(screen.getByText("oops")).toBeInTheDocument();
    expect(screen.queryByLabelText("JSON output")).not.toBeInTheDocument();
  });

  it("summarises the shape of a valid document", async () => {
    render(<JsonFormatterTool />);
    await type('{"a":{"b":[1,2]}}');
    expect(screen.getByText(/2 keys · 2 items · depth 3/)).toBeInTheDocument();
  });

  it("offers a sample only while the input is empty", async () => {
    const user = userEvent.setup();
    render(<JsonFormatterTool />);

    await user.click(screen.getByRole("button", { name: "Paste a sample" }));
    expect(output().value).toContain('"name": "Ada"');
    expect(
      screen.queryByRole("button", { name: "Paste a sample" }),
    ).not.toBeInTheDocument();
  });
});
