import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ResultPanelShell } from "@/components/organisms/result-panel-shell";

describe("ResultPanelShell", () => {
  it("shows the filename as the heading, above its children", () => {
    render(
      <ResultPanelShell title="holiday-photo.png">
        <p>result</p>
      </ResultPanelShell>,
    );

    expect(screen.getByText("holiday-photo.png")).toBeInTheDocument();
    expect(screen.getByText("result")).toBeInTheDocument();
  });

  it("renders the footer actions when given some", () => {
    render(
      <ResultPanelShell title="a.png" footer={<button>Save</button>}>
        <p>result</p>
      </ResultPanelShell>,
    );

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("omits the footer entirely when there are no actions", () => {
    const { container } = render(
      <ResultPanelShell title="a.png">
        <p>result</p>
      </ResultPanelShell>,
    );

    expect(container.querySelector('[data-slot="card-footer"]')).toBeNull();
  });
});
