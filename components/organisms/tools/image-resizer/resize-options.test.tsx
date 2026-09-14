import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DEFAULT_TRANSFORM_SETTINGS } from "@/lib/image/transform";
import { ResizeOptions } from "@/components/organisms/tools/image-resizer/resize-options";

function renderOptions(overrides = {}) {
  const onChange = vi.fn();
  render(
    <ResizeOptions
      settings={DEFAULT_TRANSFORM_SETTINGS}
      onChange={onChange}
      sourceWidth={800}
      sourceHeight={400}
      sourceType="image/png"
      {...overrides}
    />,
  );
  return onChange;
}

describe("ResizeOptions", () => {
  it("shows the current output size as the placeholder", () => {
    renderOptions();
    expect(screen.getByLabelText("Width")).toHaveAttribute("placeholder", "800");
    expect(screen.getByLabelText("Height")).toHaveAttribute("placeholder", "400");
  });

  it("locks the aspect ratio by default and says so", () => {
    renderOptions();
    expect(
      screen.getByRole("button", { name: "Unlock aspect ratio" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/ratio locked at 2\.00:1/i)).toBeInTheDocument();
  });

  it("holds only one side while the ratio is locked", async () => {
    const user = userEvent.setup();
    const onChange = renderOptions();

    await user.type(screen.getByLabelText("Width"), "4");
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ width: 4, height: undefined }),
    );
  });

  it("keeps both sides once the ratio is unlocked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ResizeOptions
        settings={{ ...DEFAULT_TRANSFORM_SETTINGS, height: 300 }}
        onChange={onChange}
        sourceWidth={800}
        sourceHeight={400}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Unlock aspect ratio" }));
    await user.type(screen.getByLabelText("Width"), "5");

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ width: 5, height: 300 }),
    );
  });

  it("offers fit modes only when the ratio is free to change", async () => {
    const user = userEvent.setup();
    renderOptions();
    expect(screen.queryByText("Fit")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Unlock aspect ratio" }));
    expect(screen.getByText("Fit")).toBeInTheDocument();
    for (const label of ["Contain", "Cover", "Stretch"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    // The active mode explains itself.
    expect(screen.getByText(/fits the whole image in/i)).toBeInTheDocument();
  });

  it("offers a scale slider only while no explicit size is set", () => {
    renderOptions();
    expect(screen.getByText(/scale \(100%\)/i)).toBeInTheDocument();

    render(
      <ResizeOptions
        settings={{ ...DEFAULT_TRANSFORM_SETTINGS, width: 640 }}
        onChange={vi.fn()}
        sourceWidth={800}
        sourceHeight={400}
      />,
    );
    expect(screen.queryAllByText(/scale \(/i)).toHaveLength(1);
  });

  it("ignores anything that is not a number", async () => {
    const user = userEvent.setup();
    const onChange = renderOptions();

    await user.type(screen.getByLabelText("Width"), "abc");
    expect(onChange).not.toHaveBeenCalled();
  });
});
