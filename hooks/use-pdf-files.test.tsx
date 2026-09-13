import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { baseName, toPdfName, usePdfFiles } from "@/hooks/use-pdf-files";

const readPdf = vi.fn();

vi.mock("@/lib/pdf", () => ({
  readPdf: (file: Blob) => readPdf(file),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

function makeFile(name: string): File {
  return new File(["%PDF"], name, { type: "application/pdf" });
}

const names = (files: { name: string }[]) => files.map((f) => f.name);

beforeEach(() => {
  readPdf.mockReset().mockResolvedValue({
    pageCount: 3,
    width: 400,
    height: 300,
    encrypted: false,
  });
});

describe("usePdfFiles", () => {
  it("reads each file as it arrives and totals the pages", async () => {
    const { result } = renderHook(() => usePdfFiles());
    act(() => result.current.add([makeFile("a.pdf"), makeFile("b.pdf")]));

    await waitFor(() => expect(result.current.usable).toHaveLength(2));
    expect(result.current.totalPages).toBe(6);
  });

  it("keeps the order files were added in, which is the merge order", async () => {
    const { result } = renderHook(() => usePdfFiles());
    act(() => result.current.add([makeFile("a.pdf"), makeFile("b.pdf")]));

    await waitFor(() => expect(result.current.usable).toHaveLength(2));
    expect(names(result.current.files)).toEqual(["a.pdf", "b.pdf"]);
  });

  it("moves a file up and down", async () => {
    const { result } = renderHook(() => usePdfFiles());
    act(() =>
      result.current.add([makeFile("a.pdf"), makeFile("b.pdf"), makeFile("c.pdf")]),
    );
    await waitFor(() => expect(result.current.usable).toHaveLength(3));

    act(() => result.current.move(result.current.files[2].id, -1));
    expect(names(result.current.files)).toEqual(["a.pdf", "c.pdf", "b.pdf"]);

    act(() => result.current.move(result.current.files[0].id, 1));
    expect(names(result.current.files)).toEqual(["c.pdf", "a.pdf", "b.pdf"]);
  });

  it("refuses to move past either end", async () => {
    const { result } = renderHook(() => usePdfFiles());
    act(() => result.current.add([makeFile("a.pdf"), makeFile("b.pdf")]));
    await waitFor(() => expect(result.current.usable).toHaveLength(2));

    act(() => result.current.move(result.current.files[0].id, -1));
    act(() => result.current.move(result.current.files[1].id, 1));
    expect(names(result.current.files)).toEqual(["a.pdf", "b.pdf"]);
  });

  it("marks a password-protected file as unusable, without dropping it", async () => {
    readPdf.mockResolvedValue({
      pageCount: 0,
      width: 0,
      height: 0,
      encrypted: true,
    });
    const { result } = renderHook(() => usePdfFiles());
    act(() => result.current.add([makeFile("locked.pdf")]));

    await waitFor(() => expect(result.current.files[0].error).toBeDefined());
    expect(result.current.files[0].error).toMatch(/password/i);
    // Still listed, so the user can see why it will not be included.
    expect(result.current.files).toHaveLength(1);
    expect(result.current.usable).toHaveLength(0);
  });

  it("reports a file that cannot be read at all", async () => {
    readPdf.mockRejectedValue(new Error("That file could not be read as a PDF."));
    const { result } = renderHook(() => usePdfFiles());
    act(() => result.current.add([makeFile("broken.pdf")]));

    await waitFor(() => expect(result.current.files[0].error).toBeDefined());
    expect(result.current.usable).toHaveLength(0);
  });

  it("removes and clears", async () => {
    const { result } = renderHook(() => usePdfFiles());
    act(() => result.current.add([makeFile("a.pdf"), makeFile("b.pdf")]));
    await waitFor(() => expect(result.current.usable).toHaveLength(2));

    act(() => result.current.remove(result.current.files[0].id));
    expect(names(result.current.files)).toEqual(["b.pdf"]);

    act(() => result.current.clear());
    expect(result.current.files).toHaveLength(0);
  });
});

describe("usePdfFiles in single-document mode", () => {
  it("keeps only the last file when several are dropped at once", async () => {
    const { result } = renderHook(() => usePdfFiles({ single: true }));
    act(() => result.current.add([makeFile("a.pdf"), makeFile("b.pdf")]));

    await waitFor(() => expect(result.current.usable).toHaveLength(1));
    expect(names(result.current.files)).toEqual(["b.pdf"]);
  });

  it("replaces the current document rather than stacking up", async () => {
    const { result } = renderHook(() => usePdfFiles({ single: true }));
    act(() => result.current.add([makeFile("first.pdf")]));
    await waitFor(() => expect(result.current.usable).toHaveLength(1));

    act(() => result.current.add([makeFile("second.pdf")]));
    await waitFor(() =>
      expect(names(result.current.files)).toEqual(["second.pdf"]),
    );
  });

  it("still appends when not in single mode", async () => {
    const { result } = renderHook(() => usePdfFiles());
    act(() => result.current.add([makeFile("a.pdf")]));
    act(() => result.current.add([makeFile("b.pdf")]));

    await waitFor(() => expect(result.current.usable).toHaveLength(2));
    expect(names(result.current.files)).toEqual(["a.pdf", "b.pdf"]);
  });
});

describe("naming", () => {
  it("swaps any extension for .pdf", () => {
    expect(toPdfName("scan.png")).toBe("scan.pdf");
    expect(toPdfName("report")).toBe("report.pdf");
  });

  it("strips the extension for split parts", () => {
    expect(baseName("report.pdf")).toBe("report");
    expect(baseName("no-extension")).toBe("no-extension");
  });
});
