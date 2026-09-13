import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DownloadButton } from "@/components/atoms/download-button";

describe("DownloadButton", () => {
  it("defaults to a plain Download label", () => {
    render(<DownloadButton onClick={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("Download");
  });

  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<DownloadButton onClick={onClick} label="Download PNG" />);

    await userEvent.click(screen.getByRole("button", { name: "Download PNG" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("blocks the click while busy, without losing its label", async () => {
    const onClick = vi.fn();
    render(<DownloadButton onClick={onClick} busy label="Download SVG" />);

    const button = screen.getByRole("button", { name: "Download SVG" });
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("stays disabled when told to, even when idle", () => {
    render(<DownloadButton onClick={vi.fn()} disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
