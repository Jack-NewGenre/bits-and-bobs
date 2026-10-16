/** A stylesheet `<link>` tag as written in the page, and the absolute URL it points at. */
export interface StylesheetLink {
  tag: string;
  href: string;
}

const LINK_TAG = /<link\b[^>]*>/gi;

/** Reads what a person typed as a page address, adding https:// when they left it off. */
export function parsePageUrl(raw: string): URL | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

function privateIpv4(address: string): boolean {
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

/**
 * Whether an IP points inside a network rather than at the public internet. The
 * fetch route refuses these so it cannot be used to reach the host's own services.
 */
export function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return privateIpv4(ip);
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
  if (mapped) return privateIpv4(mapped[1]);
  return (
    ip === "::" ||
    ip === "::1" ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    ip.startsWith("fe8") ||
    ip.startsWith("fe9") ||
    ip.startsWith("fea") ||
    ip.startsWith("feb") ||
    ip.startsWith("ff")
  );
}

function attribute(tag: string, name: string): string | undefined {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  return match ? (match[1] ?? match[2] ?? match[3]) : undefined;
}

/** The stylesheets a page links to, resolved against the page's own address. */
export function stylesheetLinks(html: string, base: URL): StylesheetLink[] {
  return (html.match(LINK_TAG) ?? []).flatMap((tag) => {
    const rel = attribute(tag, "rel")?.toLowerCase().split(/\s+/) ?? [];
    const href = attribute(tag, "href");
    if (!rel.includes("stylesheet") || rel.includes("alternate") || !href) return [];
    try {
      const url = new URL(href, base);
      return url.protocol === "http:" || url.protocol === "https:"
        ? [{ tag, href: url.href }]
        : [];
    } catch {
      return [];
    }
  });
}

/**
 * Swaps each fetched `<link>` for a `<style>` holding its CSS, in place, so the
 * page reads exactly like one saved with its styles inline. Links that could not
 * be fetched stay, and the panel reports them.
 */
export function inlineStylesheets(html: string, sheets: { tag: string; css: string }[]): string {
  return sheets.reduce(
    (page, { tag, css }) =>
      page.replace(tag, () => `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`),
    html
  );
}

/** Asks the fetch route for a page with its stylesheets inlined. Throws with a readable reason. */
export async function requestPage(url: string): Promise<string> {
  const response = await fetch(`/api/fetch-page?url=${encodeURIComponent(url)}`);
  if (response.ok) return response.text();
  const body: unknown = await response.json().catch(() => undefined);
  const reason =
    typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
      ? body.error
      : `The page could not be fetched (${response.status}).`;
  throw new Error(reason);
}
