import type { Profile } from "../src/lib/types";

const OG_TITLE = "__OG_TITLE__";
const OG_DESCRIPTION = "__OG_DESCRIPTION__";
const OG_IMAGE = "__OG_IMAGE__";
const OG_URL = "__OG_URL__";
const PAGE_TITLE = "__PAGE_TITLE__";

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Injects live OG meta tags into the SPA index.html shell. */
export function injectMeta(html: string, profile: Profile, origin: string): string {
  const title = profile.orgName || "My Links";
  const description = profile.tagline || `${title} — my links`;
  const image = `${origin}/og.png`;
  const url = origin;

  return html
    .replaceAll(PAGE_TITLE, escapeAttr(title))
    .replaceAll(OG_TITLE, escapeAttr(title))
    .replaceAll(OG_DESCRIPTION, escapeAttr(description))
    .replaceAll(OG_IMAGE, escapeAttr(image))
    .replaceAll(OG_URL, escapeAttr(url));
}