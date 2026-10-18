// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/fetch-page/route";

const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("undici", async (importOriginal) => ({
  ...(await importOriginal<typeof import("undici")>()),
  fetch: fetchMock,
}));

const call = (url: string) =>
  GET(new Request(`http://localhost/api/fetch-page?url=${encodeURIComponent(url)}`));

describe("GET /api/fetch-page", () => {
  afterEach(() => fetchMock.mockReset());

  it("rejects something that is not a web address", async () => {
    const response = await call("ftp://acme.test");
    expect(response.status).toBe(400);
  });

  it("refuses private addresses without fetching them", async () => {
    for (const url of [
      "http://127.0.0.1",
      "http://169.254.169.254/latest",
      "http://[::1]:3000",
      "http://[::ffff:127.0.0.1]:3000",
      "http://[::ffff:a9fe:a9fe]/latest",
    ]) {
      const response = await call(url);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Only public websites can be fetched." });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a redirect into a private address", async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "http://[::ffff:a00:1]/" } })
    );
    const response = await call("http://93.184.216.34");
    expect(response.status).toBe(400);
  });

  it("returns the page with its stylesheets inlined", async () => {
    fetchMock.mockImplementation((url: URL) =>
      Promise.resolve(
        new Response(
          url.pathname === "/a.css"
            ? "button { color: red }"
            : '<html><link rel="stylesheet" href="/a.css"></html>'
        )
      )
    );
    const response = await call("http://93.184.216.34");
    expect(fetchMock.mock.calls[0][1]).toHaveProperty("dispatcher");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<html><style>button { color: red }</style></html>");
  });
});
