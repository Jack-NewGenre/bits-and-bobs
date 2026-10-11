import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ClipArtCutterTool } from "@/components/organisms/tools/clip-art-cutter/clip-art-cutter-tool";

const { loadFaviconSource, findPiecesInImage, cutoutEntries, downloadZip } =
  vi.hoisted(() => ({
    loadFaviconSource: vi.fn(),
    findPiecesInImage: vi.fn(),
    cutoutEntries: vi.fn(),
    downloadZip: vi.fn(),
  }));

vi.mock("@/lib/image/favicon", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/image/favicon")>()),
  loadFaviconSource,
}));

vi.mock("@/lib/image/cutout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/image/cutout")>()),
  findPiecesInImage,
  cutoutEntries,
  paintCutout: vi.fn(),
}));

vi.mock("@/lib/zip", () => ({ downloadZip }));

const image = {} as HTMLImageElement;
const source = { image, url: "blob:sheet", width: 400, height: 200 };
const white = { kind: "colour", r: 255, g: 255, b: 255 } as const;
const piece = (x: number) => ({ x, y: 10, width: 50, height: 40 });

const renderTool = () =>
  render(
    <TooltipProvider>
      <ClipArtCutterTool />
    </TooltipProvider>,
  );

function drop(file: File) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  fireEvent.change(input!, { target: { files: [file] } });
}

const sheet = new File(["png"], "stickers.png", { type: "image/png" });

describe("ClipArtCutterTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadFaviconSource.mockResolvedValue(source);
    findPiecesInImage.mockReturnValue({
      backdrop: white,
      pieces: [piece(10), piece(100)],
    });
    cutoutEntries.mockResolvedValue([]);
  });

  it("finds the pieces as soon as the image loads", async () => {
    renderTool();
    drop(sheet);

    const pieces = await screen.findByRole("list", { name: "Pieces" });
    expect(within(pieces).getAllByRole("listitem")).toHaveLength(2);
    expect(findPiecesInImage).toHaveBeenCalledTimes(1);
    expect(findPiecesInImage).toHaveBeenCalledWith(image, source, {
      tolerance: 32,
      gap: 8,
    });
    expect(screen.getAllByRole("group", { name: /^Piece \d/ })).toHaveLength(2);
  });

  it("removes a piece from the list and the image", async () => {
    const user = userEvent.setup();
    renderTool();
    drop(sheet);

    await user.click(
      await screen.findByRole("button", { name: "Remove piece 1" }),
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(
      screen.getByRole("group", {
        name: /^Piece 1: 50 by 40 pixels at 100, 10/,
      }),
    ).toBeInTheDocument();
  });

  it("deletes the focused box with the Delete key", async () => {
    const user = userEvent.setup();
    renderTool();
    drop(sheet);

    const [first] = await screen.findAllByRole("group", { name: /^Piece \d/ });
    first.focus();
    await user.keyboard("{Delete}");

    expect(screen.getAllByRole("group", { name: /^Piece \d/ })).toHaveLength(1);
  });

  it("nudges the focused box with the arrow keys", async () => {
    const user = userEvent.setup();
    renderTool();
    drop(sheet);

    const [first] = await screen.findAllByRole("group", { name: /^Piece \d/ });
    first.focus();
    await user.keyboard("{ArrowRight}");

    expect(
      screen.getByRole("group", {
        name: /^Piece 1: 50 by 40 pixels at 14, 10/,
      }),
    ).toBeInTheDocument();
  });

  it("downloads every piece as a zip with the backdrop cleared", async () => {
    const user = userEvent.setup();
    renderTool();
    drop(sheet);

    await user.click(
      await screen.findByRole("button", { name: /Download 2 pieces/ }),
    );

    await waitFor(() =>
      expect(downloadZip).toHaveBeenCalledWith([], "stickers-pieces.zip"),
    );
    expect(cutoutEntries).toHaveBeenCalledWith(
      image,
      [expect.objectContaining(piece(10)), expect.objectContaining(piece(100))],
      "stickers.png",
      { backdrop: white, tolerance: 32 },
    );
  });

  it("keeps the backdrop when asked to", async () => {
    const user = userEvent.setup();
    renderTool();
    drop(sheet);

    await user.click(await screen.findByRole("button", { name: "Keep" }));
    await user.click(screen.getByRole("button", { name: /Download 2 pieces/ }));

    await waitFor(() => expect(cutoutEntries).toHaveBeenCalled());
    expect(cutoutEntries.mock.calls[0][3]).toBeUndefined();
  });

  it("replaces every box when finding pieces again", async () => {
    const user = userEvent.setup();
    renderTool();
    drop(sheet);
    await screen.findByRole("list", { name: "Pieces" });

    findPiecesInImage.mockReturnValue({
      backdrop: white,
      pieces: [piece(200)],
    });
    await user.click(screen.getByRole("button", { name: /Find pieces again/ }));

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("says when nothing was found", async () => {
    findPiecesInImage.mockReturnValue({ backdrop: white, pieces: [] });
    renderTool();
    drop(sheet);

    expect(await screen.findByText(/No pieces yet/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Download 0 pieces/ }),
    ).toBeDisabled();
  });
});
