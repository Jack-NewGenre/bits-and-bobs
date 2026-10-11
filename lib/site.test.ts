import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import { AVAILABLE_TOOLS, TOOLS } from "@/lib/tools";

describe("site origin", () => {
  it("has no trailing slash, so joined paths never double up", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
  });

  it("joins paths with or without a leading slash", () => {
    expect(absoluteUrl("/tools/uuid")).toBe(`${SITE_URL}/tools/uuid`);
    expect(absoluteUrl("tools/uuid")).toBe(`${SITE_URL}/tools/uuid`);
  });
});

describe("sitemap", () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);

  it("lists the home page, the changelog and every available tool", () => {
    expect(urls).toContain(absoluteUrl("/"));
    expect(urls).toContain(absoluteUrl("/changelog"));
    expect(urls).toHaveLength(AVAILABLE_TOOLS.length + 2);

    for (const tool of AVAILABLE_TOOLS) {
      expect(urls).toContain(absoluteUrl(tool.href));
    }
  });

  it("never advertises a tool that has not been built", () => {
    for (const tool of TOOLS) {
      if (tool.status === "soon") {
        expect(urls.some((url) => url.endsWith(`/${tool.slug}`))).toBe(false);
      }
    }
  });

  it("uses absolute urls", () => {
    for (const url of urls) {
      expect(url.startsWith(SITE_URL)).toBe(true);
    }
  });
});

describe("robots", () => {
  it("blocks every crawler but still points at the sitemap", () => {
    const result = robots();
    expect(result.rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(result.sitemap).toBe(absoluteUrl("/sitemap.xml"));
  });
});
