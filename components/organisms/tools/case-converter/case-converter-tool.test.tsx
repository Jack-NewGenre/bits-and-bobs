import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CaseConverterTool } from "@/components/organisms/tools/case-converter/case-converter-tool";

describe("CaseConverterTool", () => {
  it("shows no results until something is typed", () => {
    render(<CaseConverterTool />);

    expect(screen.queryByText("camelCase")).not.toBeInTheDocument();
  });

  it("shows the text in every case", async () => {
    const user = userEvent.setup();
    render(<CaseConverterTool />);

    await user.click(screen.getByLabelText("Text"));
    await user.paste("user profile id");

    expect(screen.getByText("userProfileId")).toBeInTheDocument();
    expect(screen.getByText("UserProfileId")).toBeInTheDocument();
    expect(screen.getByText("user_profile_id")).toBeInTheDocument();
    expect(screen.getByText("USER_PROFILE_ID")).toBeInTheDocument();
    expect(screen.getByText("user-profile-id")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy camelCase" })).toBeEnabled();
  });

  it("hides the results again when the text is cleared", async () => {
    const user = userEvent.setup();
    render(<CaseConverterTool />);

    const field = screen.getByLabelText("Text");
    await user.click(field);
    await user.paste("hello world");
    await user.clear(field);

    expect(screen.queryByText("helloWorld")).not.toBeInTheDocument();
  });
});
