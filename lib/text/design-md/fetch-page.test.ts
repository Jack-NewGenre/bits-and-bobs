import { afterEach, describe, expect, it, vi } from "vitest";

import {
  inlineStylesheets,
  isPrivateAddress,
  parsePageUrl,
  requestPage,
  stylesheetLinks,
} from "@/lib/text/design-md/fetch-page";

describe("parsePageUrl", () => {
  it("adds https when the scheme is missing", () => {
    expect(parsePageUrl(" example.com/a ")?.href).toBe("https://example.com/a");
  });

  it("refuses anything that is not http or https", () => {
    expect(parsePageUrl("file:///etc/passwd")).toBeUndefined();
    expect(parsePageUrl("javascript:alert(1)")).toBeUndefined();
    expect(parsePageUrl("")).toBeUndefined();
  });
});

describe("isPrivateAddress", () => {
  it("flags loopback, private and link-local addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254"]) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
    for (const ip of ["::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "[::1]"]) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
  });

  it("lets public addresses through", () => {
    expect(isPrivateAddress("93.184.216.34")).toBe(false);
    expect(isPrivateAddress("172.32.0.1")).toBe(false);
    expect(isPrivateAddress("2606:4700::1111")).toBe(false);
  });
});

describe("stylesheetLinks", () => {
  const base = new URL("https://acme.test/blog/post");

  it("resolves stylesheet links against the page", () => {
    const html = `<link rel="stylesheet" href="/a.css"><link href='b.css' rel=stylesheet>
      <link rel="icon" href="/x.ico"><link rel="alternate stylesheet" href="/c.css">`;
    expect(stylesheetLinks(html, base).map((link) => link.href)).toEqual([
      "https://acme.test/a.css",
      "https://acme.test/blog/b.css",
    ]);
  });

  it("skips links without an http address", () => {
    expect(stylesheetLinks('<link rel="stylesheet" href="data:text/css,a{}">', base)).toEqual([]);
  });
});

describe("inlineStylesheets", () => {
  it("swaps each link for its CSS in place", () => {
    const tag = '<link rel="stylesheet" href="/a.css">';
    const page = inlineStylesheets(`<head>${tag}<link rel="stylesheet" href="/b.css"></head>`, [
      { tag, css: "a { color: red } </style>" },
    ]);
    expect(page).toBe(
      '<head><style>a { color: red } <\\/style></style><link rel="stylesheet" href="/b.css"></head>'
    );
  });
});

describe("requestPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the page text", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("<html></html>"));
    vi.stubGlobal("fetch", fetchMock);
    expect(await requestPage("acme.test")).toBe("<html></html>");
    expect(fetchMock).toHaveBeenCalledWith("/api/fetch-page?url=acme.test");
  });

  it("throws the route's reason", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ error: "Nope." }, { status: 400 }))
    );
    await expect(requestPage("acme.test")).rejects.toThrow("Nope.");
  });
});
