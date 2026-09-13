import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { JwtDecoderTool } from "@/components/organisms/tools/jwt-decoder/jwt-decoder-tool";

function makeToken(payload: object): string {
  const encode = (value: object) => {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.sig`;
}

async function paste(token: string) {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText("Token"));
  await user.paste(token);
}

describe("JwtDecoderTool", () => {
  it("shows nothing before a token is pasted", () => {
    render(<JwtDecoderTool />);
    expect(screen.queryByLabelText("Header")).not.toBeInTheDocument();
  });

  it("splits a token into header, payload and claims", async () => {
    render(<JwtDecoderTool />);
    await paste(makeToken({ sub: "123", name: "Ada" }));

    expect(screen.getByLabelText<HTMLTextAreaElement>("Header").value).toContain(
      "HS256",
    );
    expect(screen.getByLabelText<HTMLTextAreaElement>("Payload").value).toContain(
      "Ada",
    );
    expect(screen.getByText("Claims")).toBeInTheDocument();
    expect(screen.getByText(/Subject: who it is about/)).toBeInTheDocument();
  });

  it("warns about an expired token", async () => {
    render(<JwtDecoderTool />);
    await paste(makeToken({ exp: Math.floor(Date.now() / 1000) - 60 }));
    expect(screen.getByText("This token has expired.")).toBeInTheDocument();
  });

  it("confirms one that is still valid", async () => {
    render(<JwtDecoderTool />);
    await paste(makeToken({ exp: Math.floor(Date.now() / 1000) + 600 }));
    expect(screen.getByText("This token has not expired.")).toBeInTheDocument();
  });

  it("says nothing about expiry when the token carries none", async () => {
    render(<JwtDecoderTool />);
    await paste(makeToken({ sub: "1" }));
    expect(screen.queryByText(/has expired|has not expired/)).not.toBeInTheDocument();
  });

  it("explains a malformed token", async () => {
    render(<JwtDecoderTool />);
    await paste("not.a.jwt");
    expect(screen.getByText(/not valid base64url JSON/i)).toBeInTheDocument();
  });

  it("warns that the token is readable by anyone holding it", () => {
    render(<JwtDecoderTool />);
    expect(screen.getByText(/only encoded, not encrypted/i)).toBeInTheDocument();
  });
});
