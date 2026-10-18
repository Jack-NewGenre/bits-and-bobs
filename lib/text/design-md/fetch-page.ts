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
  const groups = ipv6Groups(ip);
  if (!groups) return true;
  const embedded = embeddedIpv4(groups);
  if (embedded) return privateIpv4(embedded);
  const [first] = groups;
  // Unique local (fc00::/7), then link-local, site-local and multicast (fe80:: upwards).
  return (first & 0xfe00) === 0xfc00 || first >= 0xfe80;
}

/** The eight 16-bit groups of an IPv6 address, or undefined if it is not one. */
function ipv6Groups(ip: string): number[] | undefined {
  const dotted = /^(.*:)(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
  const tail = dotted ? dotted[2].split(".").map(Number) : [];
  if (tail.some((octet) => octet > 255)) return undefined;
  const hex = dotted
    ? `${dotted[1]}${((tail[0] << 8) | tail[1]).toString(16)}:${((tail[2] << 8) | tail[3]).toString(16)}`
    : ip;
  const halves = hex.split("::");
  if (halves.length > 2) return undefined;
  const parse = (part: string) => (part ? part.split(":") : []);
  const head = parse(halves[0]);
  const rest = halves.length === 2 ? parse(halves[1]) : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return undefined;
  const parts = [...head, ...Array<string>(missing).fill("0"), ...rest];
  if (!parts.every((part) => /^[0-9a-f]{1,4}$/.test(part))) return undefined;
  return parts.map((part) => Number.parseInt(part, 16));
}

/**
 * The IPv4 address an IPv6 address stands for, when it carries one: mapped
 * (`::ffff:0:0/96`), compatible (`::/96`, which also covers `::` and `::1`),
 * NAT64 (`64:ff9b::/96`) and 6to4 (`2002::/16`).
 */
function embeddedIpv4(groups: number[]): string | undefined {
  const ipv4 = (high: number, low: number) =>
    [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
  const zeroes = (from: number, to: number) => groups.slice(from, to).every((g) => g === 0);
  if (zeroes(0, 5) && (groups[5] === 0xffff || groups[5] === 0)) {
    return ipv4(groups[6], groups[7]);
  }
  if (groups[0] === 0x64 && groups[1] === 0xff9b && zeroes(2, 6)) {
    return ipv4(groups[6], groups[7]);
  }
  if (groups[0] === 0x2002) return ipv4(groups[1], groups[2]);
  return undefined;
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
