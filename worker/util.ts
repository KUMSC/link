import type { Env } from "./env";

/**
 * KV caching of the public payload is optional: it activates when the CACHE
 * binding exists. Cloudflare auto-provisions D1 and R2, but NOT KV namespaces
 * — so the app must deploy (and run) fine without one.
 */
const CACHE_KEY = "public";
/** 30s TTL for the public payload (free tier min TTL). */
export const PUBLIC_CACHE_TTL = 30;

export async function getCachedPublic<T>(env: Env): Promise<T | null> {
  if (!env.CACHE) return null;
  const raw = await env.CACHE.get(CACHE_KEY, "text").catch(() => null);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function cachePublic(env: Env, data: unknown): Promise<void> {
  if (!env.CACHE) return;
  await env.CACHE.put(CACHE_KEY, JSON.stringify(data), { expirationTtl: PUBLIC_CACHE_TTL }).catch(() => {});
}

export async function invalidatePublicCache(env: Env): Promise<void> {
  if (!env.CACHE) return;
  await env.CACHE.delete(CACHE_KEY).catch(() => {});
}

const DEVICE_RE = /(android|iphone|ipad|ipod|mobile)/i;
const MOBILE_RE = /(android|iphone|ipod)/i;
const TABLET_RE = /(ipad)/i;

export function detectDevice(ua: string | null): string {
  if (!ua) return "Unknown";
  if (TABLET_RE.test(ua)) return "Tablet";
  if (MOBILE_RE.test(ua)) return "Mobile";
  if (DEVICE_RE.test(ua)) return "Mobile";
  return "Desktop";
}

/** Normalize an optional header value to `string | null`. */
export function nullable(v: string | undefined): string | null {
  return v ?? null;
}

/**
 * Privacy-friendly visitor hash: SHA-256 of (IP + UA + day), so the same
 * visitor on the same day is counted once, but no raw IP/UA is persisted.
 */
export async function visitorHash(request: Request): Promise<string> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "";
  const ua = request.headers.get("User-Agent") ?? "";
  const day = new Date().toISOString().slice(0, 10);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${ua}|${day}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}