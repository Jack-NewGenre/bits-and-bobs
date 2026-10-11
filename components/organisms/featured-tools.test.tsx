import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { FEATURED_TOOLS } from "@/lib/tools";
import { FeaturedTools } from "@/components/organisms/featured-tools";

describe("FeaturedTools", () => {
  it("links to every featured tool under a labelled section", () => {
    render(<FeaturedTools />);

    const section = screen.getByRole("region", { name: "Featured tools" });
    const links = within(section).getAllByRole("link");

    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      FEATURED_TOOLS.map((tool) => tool.href),
    );
  });

  it("shows each featured tool's name and description", () => {
    render(<FeaturedTools />);

    for (const tool of FEATURED_TOOLS) {
      expect(screen.getByText(tool.name)).toBeInTheDocument();
      expect(screen.getByText(tool.description)).toBeInTheDocument();
    }
  });
});
