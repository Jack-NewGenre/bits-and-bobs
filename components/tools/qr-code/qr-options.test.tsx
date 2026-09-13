import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DEFAULT_QR_SETTINGS } from "@/lib/generators/qr";
import { QrOptions } from "@/components/tools/qr-code/qr-options";

function renderOptions(overrides = {}) {
  const onChange = vi.fn();
  render(
    <QrOptions
      settings={{ ...DEFAULT_QR_SETTINGS, ...overrides }}
      onChange={onChange}
    />,
  );
  return onChange;
}

describe("QrOptions", () => {
  it("offers every module shape", () => {
    renderOptions();
    for (const label of ["Square", "Rounded", "Dots"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("explains why the corners stay solid", () => {
    renderOptions();
    expect(screen.getByText(/corner squares stay solid/i)).toBeInTheDocument();
  });

  it("reports a shape change", async () => {
    const user = userEvent.setup();
    const onChange = renderOptions();

    await user.click(screen.getByRole("button", { name: "Dots" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ shape: "dot" }),
    );
  });

  it("says what each error-correction level buys", async () => {
    const user = userEvent.setup();
    const onChange = renderOptions();
    expect(screen.getByText(/15% recoverable/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "High" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ ecc: "high" }),
    );
  });

  it("shows both colour pickers with their current values", () => {
    renderOptions({ foreground: "#112233" });
    expect(screen.getByLabelText("Foreground colour")).toHaveValue("#112233");
    expect(screen.getByLabelText("Background colour")).toHaveValue("#ffffff");
    expect(screen.getByText("#112233")).toBeInTheDocument();
  });

  it("reports a quiet-zone change", async () => {
    const user = userEvent.setup();
    const onChange = renderOptions();

    screen.getByRole("slider", { name: "Quiet zone" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ margin: 3 }),
    );
  });

  it("offers the export sizes", async () => {
    const user = userEvent.setup();
    const onChange = renderOptions();

    await user.click(screen.getByRole("button", { name: "1024px" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ size: 1024 }),
    );
  });
});
