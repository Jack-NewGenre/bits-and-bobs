/** Single source of truth for the site's identity and canonical origin. */

export const SITE_NAME = "Toolbox";

export const SITE_DESCRIPTION =
  "A clean, private collection of everyday tools that run entirely in your browser. No uploads, no accounts, no cost.";

/**
 * The canonical origin, used for `metadataBase`, the sitemap and robots.txt.
 *
 * Vercel sets `VERCEL_PROJECT_PRODUCTION_URL` to the production domain on
 * every deployment, so previews and production both resolve correctly without
 * anything being hard-coded. `NEXT_PUBLIC_SITE_URL` overrides it when the site
 * is served from a custom domain or somewhere other than Vercel.
 */
export const SITE_URL = normaliseOrigin(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
);

function normaliseOrigin(value: string): string {
  const withProtocol = /^https?:\/\//.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

/** Absolute URL for a site-relative path, for sitemaps and canonical tags. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
