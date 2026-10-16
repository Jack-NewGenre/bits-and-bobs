import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { SiteChrome } from "@/components/layout/site-chrome";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

// The sidebar checks the screen width, which jsdom does not provide.
vi.stubGlobal(
  "matchMedia",
  vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
);

function renderAt(path: string) {
  pathname.current = path;
  render(
    <SiteChrome
      fullScreenPaths={["/tools/image-editor"]}
      sidebar={<nav>site sidebar</nav>}
      header={<header>site header</header>}
    >
      <p>page</p>
    </SiteChrome>,
  );
}

describe("SiteChrome", () => {
  it("wraps ordinary pages in the sidebar and header", () => {
    renderAt("/tools/uuid");
    expect(screen.getByText("site sidebar")).toBeInTheDocument();
    expect(screen.getByText("site header")).toBeInTheDocument();
    expect(document.getElementById("main")).toHaveTextContent("page");
  });

  it("tucks the mat 1px under the sidebar, so their edges make one line", () => {
    renderAt("/tools/uuid");
    const mat = document.querySelector('[data-slot="sidebar-inset"]');
    expect(mat).toHaveClass("bg-mat", "md:-ml-px");
  });

  it("prints the ruler along the mat's edges, under the page", () => {
    renderAt("/tools/uuid");
    const edge = document.querySelector('[data-slot="mat-edge"]');
    expect(edge?.parentElement).toHaveAttribute("data-slot", "sidebar-inset");
    expect(edge).toHaveTextContent("5");
    expect(document.getElementById("main")).toHaveClass("relative");
  });

  it("gives a full-screen tool the whole window", () => {
    renderAt("/tools/image-editor");
    expect(screen.queryByText("site sidebar")).not.toBeInTheDocument();
    expect(screen.queryByText("site header")).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="mat-edge"]')).toBeNull();
    expect(document.getElementById("main")).toHaveTextContent("page");
  });
});
