import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ColourInput } from "@/components/shared/colour-input";

const BLUE = { r: 59, g: 130, b: 246, a: 1 };

describe("ColourInput", () => {
  it("shows the colour as hex and offers a picker", () => {
    render(<ColourInput label="Text" value={BLUE} onChange={vi.fn()} />);

    expect(screen.getByLabelText("Text")).toHaveValue("#3b82f6");
    expect(screen.getByLabelText("Text picker")).toHaveValue("#3b82f6");
  });

  it("accepts any CSS colour syntax, not just hex", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColourInput label="Text" value={BLUE} onChange={onChange} />);

    const field = screen.getByLabelText("Text");
    await user.clear(field);
    await user.paste("rgb(255 0 0)");

    expect(onChange).toHaveBeenLastCalledWith({ r: 255, g: 0, b: 0, a: 1 });
  });

  it("keeps half-typed text on screen instead of snapping it back", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColourInput label="Text" value={BLUE} onChange={onChange} />);

    const field = screen.getByLabelText("Text");
    await user.clear(field);
    await user.type(field, "#ff");

    expect(field).toHaveValue("#ff");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/not a colour yet/i)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("follows a colour changed from outside", () => {
    const { rerender } = render(
      <ColourInput label="Text" value={BLUE} onChange={vi.fn()} />,
    );
    expect(screen.getByLabelText("Text")).toHaveValue("#3b82f6");

    rerender(
      <ColourInput
        label="Text"
        value={{ r: 255, g: 0, b: 0, a: 1 }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Text")).toHaveValue("#ff0000");
  });

  it("does not rewrite equivalent text the user typed themselves", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <ColourInput label="Text" value={BLUE} onChange={onChange} />,
    );

    const field = screen.getByLabelText("Text");
    await user.clear(field);
    await user.paste("rgb(255 0 0)");

    // The parent echoes the parsed colour back; the typed form should stay.
    rerender(
      <ColourInput
        label="Text"
        value={{ r: 255, g: 0, b: 0, a: 1 }}
        onChange={onChange}
      />,
    );
    expect(field).toHaveValue("rgb(255 0 0)");
  });
});
