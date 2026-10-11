import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FAVICON_SIZES } from "@/lib/image/favicon";
import { FaviconGeneratorTool } from "@/components/organisms/tools/favicon-generator/favicon-generator-tool";

const { renderFavicons, loadFaviconSource } = vi.hoisted(() => ({
  renderFavicons: vi.fn(),
  loadFaviconSource: vi.fn(),
}));

vi.mock("@/lib/image/favicon", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/image/favicon")>()),
  renderFavicons,
  loadFaviconSource,
}));

const image = {} as HTMLImageElement;
const source = { image, url: "blob:source", width: 300, height: 100 };
const icons = FAVICON_SIZES.map((size) => ({
  size,
  blob: new Blob([], { type: "image/png" }),
}));

function drop(file: File) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  fireEvent.change(input!, { target: { files: [file] } });
}

const logo = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });

describe("FaviconGeneratorTool", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    renderFavicons.mockReset();
    loadFaviconSource.mockReset();
    loadFaviconSource.mockResolvedValue(source);
  });

  it("accepts an SVG and shows every size with the HTML snippet", async () => {
    renderFavicons.mockResolvedValue(icons);
    render(<FaviconGeneratorTool />);

    drop(logo);

    expect(await screen.findByText("512×512")).toBeInTheDocument();
    expect(renderFavicons).toHaveBeenCalledWith(image, {
      crop: { x: 100, y: 0, side: 100 },
      radius: 0,
      background: undefined,
    });
    expect(screen.getAllByRole("img", { name: /icon$/ })).toHaveLength(
      FAVICON_SIZES.length,
    );
    expect(screen.getByText(/apple-touch-icon\.png/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download all/ })).toBeEnabled();
  });

  it("redraws with the corner radius and a moved crop", async () => {
    renderFavicons.mockResolvedValue(icons);
    render(<FaviconGeneratorTool />);

    drop(logo);
    const area = await screen.findByRole("group", { name: /pixel square/ });
    fireEvent.keyDown(
      screen.getByRole("slider", { name: "Corner radius (%)" }),
      { key: "End" },
    );
    fireEvent.keyDown(area, { key: "ArrowLeft", shiftKey: true });

    await waitFor(() =>
      expect(renderFavicons).toHaveBeenLastCalledWith(image, {
        crop: { x: 70, y: 0, side: 100 },
        radius: 50,
        background: undefined,
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /Reset crop/ }));
    await waitFor(() =>
      expect(renderFavicons).toHaveBeenLastCalledWith(image, {
        crop: { x: 100, y: 0, side: 100 },
        radius: 50,
        background: undefined,
      }),
    );
  });

  it("fills the background with a preset or a custom colour", async () => {
    renderFavicons.mockResolvedValue(icons);
    render(<FaviconGeneratorTool />);

    drop(logo);
    fireEvent.click(await screen.findByRole("button", { name: "Black" }));
    await waitFor(() =>
      expect(renderFavicons).toHaveBeenLastCalledWith(
        image,
        expect.objectContaining({ background: { r: 0, g: 0, b: 0, a: 1 } }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    fireEvent.change(screen.getByLabelText("Background colour"), {
      target: { value: "#ff0000" },
    });
    await waitFor(() =>
      expect(renderFavicons).toHaveBeenLastCalledWith(
        image,
        expect.objectContaining({ background: { r: 255, g: 0, b: 0, a: 1 } }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "None" }));
    await waitFor(() =>
      expect(renderFavicons).toHaveBeenLastCalledWith(
        image,
        expect.objectContaining({ background: undefined }),
      ),
    );
  });

  it("explains a file it could not read", async () => {
    loadFaviconSource.mockRejectedValue(new Error("decode failed"));
    render(<FaviconGeneratorTool />);

    drop(logo);

    expect(
      await screen.findByText("Could not read logo.svg. Try another file."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download all/ })).toBeDisabled();
  });

  it("goes back to the dropzone for a new image", async () => {
    renderFavicons.mockResolvedValue([]);
    render(<FaviconGeneratorTool />);

    drop(logo);
    fireEvent.click(await screen.findByRole("button", { name: /New image/ }));

    expect(
      screen.getByRole("button", { name: "Upload images" }),
    ).toBeInTheDocument();
  });
});
