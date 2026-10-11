import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { takeHandedOffFiles } from "@/lib/file-handoff";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToolSearch } from "@/components/organisms/tool-search";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup() {
  render(
    <TooltipProvider>
      <ToolSearch>
        <p>Catalogue</p>
      </ToolSearch>
    </TooltipProvider>
  );
  return {
    user: userEvent.setup(),
    input: screen.getByRole("searchbox", { name: "Search tools" }),
  };
}

describe("ToolSearch", () => {
  it("shows the catalogue until something is typed", async () => {
    const { user, input } = setup();
    expect(screen.getByText("Catalogue")).toBeInTheDocument();

    await user.type(input, "uuid");
    expect(screen.queryByText("Catalogue")).not.toBeInTheDocument();
    const results = screen.getByRole("region", { name: "Search results" });
    expect(within(results).getByText("UUID Generator")).toBeInTheDocument();
  });

  it("says so when nothing matches", async () => {
    const { user, input } = setup();
    await user.type(input, "qwertyzxcv");
    expect(
      screen.getByText('Nothing matches "qwertyzxcv" yet. Try a suggestion above.')
    ).toBeInTheDocument();
  });

  it("clears with Escape and with the clear button", async () => {
    const { user, input } = setup();
    await user.type(input, "pdf{Escape}");
    expect(input).toHaveValue("");
    expect(screen.getByText("Catalogue")).toBeInTheDocument();

    await user.type(input, "pdf");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });

  it("opens the top result on Enter", async () => {
    const { user, input } = setup();
    await user.type(input, "uuid{Enter}");
    expect(push).toHaveBeenCalledWith("/tools/uuid");
  });

  it("focuses the field on load with a mouse", () => {
    vi.stubGlobal("matchMedia", (media: string) => ({
      matches: media === "(pointer: fine)",
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const { input } = setup();
    expect(input).toHaveFocus();
  });

  it("goes somewhere at random when feeling lucky", async () => {
    const { user } = setup();
    push.mockClear();
    await user.click(screen.getByRole("button", { name: "I'm feeling lucky" }));
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/tools\//));
  });

  it("pastes clipboard text into the search", async () => {
    const { user, input } = setup();
    await navigator.clipboard.writeText("merge pdf");
    await user.click(screen.getByRole("button", { name: "Paste" }));
    expect(input).toHaveValue("merge pdf");
    expect(screen.getByText("Merge PDF")).toBeInTheDocument();
  });
});

describe("ToolSearch as a sentence", () => {
  it("labels the field with the start of the sentence", () => {
    setup();
    expect(screen.getByText("I want to")).toBeInTheDocument();
  });

  it("types an example out as the placeholder", async () => {
    const { input } = setup();
    await waitFor(() => expect(input.getAttribute("placeholder")).toMatch(/^remove/));
  });

  it("fills the search from a suggestion", async () => {
    const { user, input } = setup();
    const chip = screen.getByRole("button", { name: "merge some PDFs" });
    await user.click(chip);
    expect(input).toHaveValue("merge");
    expect(input).toHaveFocus();
    expect(chip).toHaveAttribute("aria-pressed", "true");
    const results = screen.getByRole("region", { name: "Search results" });
    expect(within(results).getByText("Merge PDF")).toBeInTheDocument();
  });
});

describe("ToolSearch with a file", () => {
  const png = () => new File(["x"], "photo.png", { type: "image/png" });

  it("lists the tools that open a chosen file, then hands it over on Enter", async () => {
    const { user, input } = setup();
    await user.upload(screen.getByTestId("tool-search-file"), png());

    const matches = screen.getByRole("region", { name: "Tools for your file" });
    expect(within(matches).getByText("Photo Studio")).toBeInTheDocument();
    expect(within(matches).queryByText("Merge PDF")).not.toBeInTheDocument();
    expect(screen.queryByText("Catalogue")).not.toBeInTheDocument();

    push.mockClear();
    input.focus();
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/tools/image-editor");
    expect(takeHandedOffFiles().map((file) => file.name)).toEqual(["photo.png"]);
  });

  it("takes a file dropped anywhere on the page", () => {
    setup();
    fireEvent.drop(window, {
      dataTransfer: { types: ["Files"], files: [png()] },
    });
    expect(screen.getByText("photo.png")).toBeInTheDocument();
  });

  it("says so when no tool opens the file", async () => {
    const { user } = setup();
    const notes = new File(["x"], "notes.txt", { type: "text/plain" });
    await user.upload(screen.getByTestId("tool-search-file"), notes);
    expect(screen.getByText("No tool opens notes.txt")).toBeInTheDocument();
  });

  it("drops the file when you start typing or press Escape", async () => {
    const { user, input } = setup();
    await user.upload(screen.getByTestId("tool-search-file"), png());
    await user.type(input, "uuid");
    expect(screen.queryByText("photo.png")).not.toBeInTheDocument();

    await user.upload(screen.getByTestId("tool-search-file"), png());
    await user.type(input, "{Escape}");
    expect(screen.getByText("Catalogue")).toBeInTheDocument();
    expect(takeHandedOffFiles()).toEqual([]);
  });
});
