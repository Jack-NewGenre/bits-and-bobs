import { act } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { setCommandMenuOpen } from "@/hooks/use-command-menu";
import { CommandMenuButton } from "@/components/atoms/command-menu-button";
import { CommandMenu } from "@/components/organisms/command-menu";

const push = vi.fn();
const setTheme = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next-themes", () => ({ useTheme: () => ({ setTheme }) }));

beforeAll(() => {
  // cmdk scrolls the selected item into view, which jsdom does not implement.
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  act(() => setCommandMenuOpen(false));
  vi.clearAllMocks();
});

async function openMenu() {
  render(<CommandMenu />);
  const user = userEvent.setup();
  await user.keyboard("{Meta>}k{/Meta}");
  return { user, input: screen.getByRole("combobox") };
}

const selected = () => document.querySelector("[cmdk-item][data-selected=true]");

describe("CommandMenu", () => {
  it("toggles with ⌘K and Ctrl+K", async () => {
    const { user } = await openMenu();
    expect(screen.getByRole("dialog", { name: "Command menu" })).toBeInTheDocument();

    await user.keyboard("{Control>}k{/Control}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens from the header button", async () => {
    render(
      <>
        <CommandMenuButton />
        <CommandMenu />
      </>
    );
    await userEvent.setup().click(screen.getByRole("button", { name: /Search tools/ }));
    expect(screen.getByRole("dialog", { name: "Command menu" })).toBeInTheDocument();
  });

  it("opens the top tool on Enter and closes", async () => {
    const { user, input } = await openMenu();
    await user.type(input, "uuid{Enter}");
    expect(push).toHaveBeenCalledWith("/tools/uuid");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("puts name matches first, like the home page search", async () => {
    const { user, input } = await openMenu();
    await user.type(input, "pdf");
    expect(selected()?.textContent?.toLowerCase()).toContain("pdf");
  });

  it("goes to a page", async () => {
    const { user, input } = await openMenu();
    await user.type(input, "changelog{Enter}");
    expect(push).toHaveBeenCalledWith("/changelog");
  });

  it("switches the theme", async () => {
    const { user, input } = await openMenu();
    await user.type(input, "dark theme{Enter}");
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("switches to a cutting-mat theme", async () => {
    const { user, input } = await openMenu();
    await user.type(input, "green theme{Enter}");
    expect(setTheme).toHaveBeenCalledWith("green");
  });

  it("says so when nothing matches", async () => {
    const { user, input } = await openMenu();
    await user.type(input, "qwertyzxcv");
    expect(screen.getByText("Nothing matches that. Try another word.")).toBeInTheDocument();
  });
});
