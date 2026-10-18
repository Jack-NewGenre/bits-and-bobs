import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import { isIP, type LookupFunction } from "node:net";

import { Agent, fetch, type Response } from "undici";

import {
  inlineStylesheets,
  isPrivateAddress,
  parsePageUrl,
  stylesheetLinks,
} from "@/lib/text/design-md/fetch-page";

const MAX_PAGE_BYTES = 3_000_000;
const MAX_SHEET_BYTES = 2_000_000;
const MAX_SHEETS = 20;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 10_000;

class FetchError extends Error {
  constructor(
    message: string,
    readonly status = 502
  ) {
    super(message);
  }
}

const PRIVATE_MESSAGE = "Only public websites can be fetched.";

/**
 * Resolves for the socket itself and refuses private answers there, so a name
 * cannot pass the check below and then resolve somewhere else for the fetch.
 */
const publicLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses: LookupAddress[]) => {
    if (error) return callback(error, "");
    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
      return callback(new FetchError(PRIVATE_MESSAGE, 400), "");
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
};

const PUBLIC_ONLY = new Agent({ connect: { lookup: publicLookup } });

/** Checks up front for a clear error message; `publicLookup` is what enforces it. */
async function assertPublic(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [host]
    : (await lookup(host, { all: true }).catch(() => [])).map((entry) => entry.address);
  if (addresses.length === 0) throw new FetchError(`${host} could not be found.`, 400);
  if (addresses.some(isPrivateAddress)) {
    throw new FetchError(PRIVATE_MESSAGE, 400);
  }
}

async function readCapped(response: Response, limit: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new FetchError("The page is too large to read.");
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** Follows redirects by hand so every hop is checked against private addresses. */
async function fetchPublic(start: URL, limit: number): Promise<{ url: URL; text: string }> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(url);
    const response = await fetch(url, {
      dispatcher: PUBLIC_ONLY,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "Mozilla/5.0 (compatible; BitsAndBobs DESIGN.md Creator)" },
    }).catch((error: unknown) => {
      throw error instanceof Error && error.cause instanceof FetchError ? error.cause : error;
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      url = new URL(location, url);
      if (url.protocol !== "http:" && url.protocol !== "https:") break;
      continue;
    }
    if (!response.ok) throw new FetchError(`The site answered ${response.status}.`);
    return { url, text: await readCapped(response, limit) };
  }
  throw new FetchError("The page redirected too many times.");
}

/**
 * Fetches a public page and its stylesheets for the DESIGN.md Creator, which
 * a browser cannot do itself because of CORS. It only ever receives a URL, never
 * a user's file, and it keeps nothing. All parsing still happens in the browser.
 */
export async function GET(request: Request) {
  const url = parsePageUrl(new URL(request.url).searchParams.get("url") ?? "");
  if (!url) return Response.json({ error: "That is not a web address." }, { status: 400 });

  try {
    const page = await fetchPublic(url, MAX_PAGE_BYTES);
    const links = stylesheetLinks(page.text, page.url).slice(0, MAX_SHEETS);
    const sheets = await Promise.all(
      links.map(({ tag, href }) =>
        fetchPublic(new URL(href), MAX_SHEET_BYTES)
          .then(({ text }) => [{ tag, css: text }])
          .catch(() => [])
      )
    );
    return new Response(inlineStylesheets(page.text, sheets.flat()), {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof FetchError ? error.status : 502;
    const message =
      error instanceof FetchError ? error.message : "The site could not be reached.";
    return Response.json({ error: message }, { status });
  }
}
