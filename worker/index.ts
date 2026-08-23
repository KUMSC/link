import { Hono } from "hono";
import type { Env } from "./env";
import { verifyAccess } from "./access";
import {
  clearAvatarKey,
  clearBannerKey,
  createLink,
  deleteLink,
  getAllClicks,
  getBreakdown,
  getClickTotals,
  getDailyClicks,
  getLink,
  getLinks,
  getProfile,
  getReferrerBreakdown,
  getTotalClicks,
  getTotalViews,
  getUniqueVisitors,
  recordClick,
  recordView,
  reorderLinks,
  setAvatarKey,
  setBannerKey,
  updateLink,
  updateProfile,
} from "./db";
import { injectBootstrap, injectMeta } from "./meta";
import { ensureSchema } from "./schema";
import { logger } from "./log";
import { cachePublic, detectDevice, getCachedPublic, invalidatePublicCache, nullable, visitorHash } from "./util";
import type { Theme } from "../src/lib/types";
import { parseTheme } from "../src/lib/types";

type Bindings = Env;

type AppEnv = {
  Bindings: Bindings;
  Variables: { email: string };
};

const app = new Hono<AppEnv>();

// Self-heal on an empty (auto-provisioned) D1 before any DB-backed route runs.
app.use("*", async (c, next) => {
  const start = Date.now();
  await ensureSchema(c.env.DB);
  await next();
  const ms = Date.now() - start;
  const url = new URL(c.req.url);
  logger.info("request", {
    method: c.req.method,
    path: url.pathname,
    status: c.res.status,
    duration_ms: ms,
  });
});

app.onError((err, c) => {
  const url = new URL(c.req.url);
  logger.error("unhandled_error", {
    path: url.pathname,
    message: err.message,
    name: err.name,
  });
  return c.json({ error: "Internal Server Error" }, 500);
});

async function loadPublic(env: Env) {
  const [profile, links] = await Promise.all([getProfile(env.DB), getActivePublicLinks(env.DB)]);
  return { profile, links };
}

// SPA shell with live OG meta injected. Served before static assets on "/".
app.get("/", async (c) => {
  const { profile, links } = await loadPublic(c.env);
  // Record a page view (fire-and-forget) using a privacy-friendly hash.
  c.executionCtx.waitUntil(
    (async () => {
      const hash = await visitorHash(c.req.raw);
      const ua = nullable(c.req.header("User-Agent"));
      const srcTag = nullable(c.req.query("src") || c.req.query("utm_source") || c.req.query("ref"));
      await recordView(c.env.DB, {
        visitorHash: hash,
        referer: nullable(c.req.header("Referer")),
        country: (c.req.raw as Request & { cf?: { country?: string | null } }).cf?.country ?? null,
        device: detectDevice(ua),
        sourceTag: srcTag,
      });
    })(),
  );
  const origin = new URL(c.req.url).origin;
  const assetRes = await c.env.ASSETS.fetch(c.req.raw);
  let html = await assetRes.text();
  html = injectMeta(html, profile, origin);
  html = injectBootstrap(html, profile, links);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
});

// ---- Public API ----------------------------------------------------------

app.get("/api/public", async (c) => {
  // Record a page view (fire-and-forget) using a privacy-friendly hash.
  c.executionCtx.waitUntil(
    (async () => {
      const hash = await visitorHash(c.req.raw);
      const ua = nullable(c.req.header("User-Agent"));
      const srcTag = nullable(c.req.query("src") || c.req.query("utm_source") || c.req.query("ref"));
      await recordView(c.env.DB, {
        visitorHash: hash,
        referer: nullable(c.req.header("Referer")),
        country: (c.req.raw as Request & { cf?: { country?: string | null } }).cf?.country ?? null,
        device: detectDevice(ua),
        sourceTag: srcTag,
      });
    })(),
  );

  // Serve from KV cache when fresh, else compute + cache.
  const cached = await getCachedPublic<{ profile: unknown; links: unknown }>(c.env);
  if (cached) return c.json(cached);
  const data = await loadPublic(c.env);
  c.executionCtx.waitUntil(cachePublic(c.env, data));
  return c.json(data);
});

app.get("/api/avatar", async (c) => {
  const profile = await getProfile(c.env.DB);
  if (!profile.avatarKey) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }
  const obj = await c.env.UPLOADS.get(profile.avatarKey);
  if (!obj) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }
  const etag = `"${profile.avatarKey}-${profile.updatedAt}"`;
  if (c.req.header("If-None-Match") === etag) {
    return new Response(null, { status: 304 });
  }
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("ETag", etag);
  const hasVersion = c.req.query("v");
  if (hasVersion) {
    headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
  } else {
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  }
  return new Response(obj.body, { headers });
});

app.get("/api/banner", async (c) => {
  const profile = await getProfile(c.env.DB);
  if (!profile.bannerKey) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }
  const obj = await c.env.UPLOADS.get(profile.bannerKey);
  if (!obj) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }
  const etag = `"${profile.bannerKey}-${profile.updatedAt}"`;
  if (c.req.header("If-None-Match") === etag) {
    return new Response(null, { status: 304 });
  }
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("ETag", etag);
  const hasVersion = c.req.query("v");
  if (hasVersion) {
    headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
  } else {
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  }
  return new Response(obj.body, { headers });
});

// Public thumbnail for a link/event card: /api/thumb/:id
app.get("/api/thumb/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.notFound();
  const link = await getLink(c.env.DB, id);
  if (!link?.thumbnailKey) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }
  const obj = await c.env.UPLOADS.get(link.thumbnailKey);
  if (!obj) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }
  const etag = `"${link.thumbnailKey}-${link.createdAt}"`;
  if (c.req.header("If-None-Match") === etag) {
    return new Response(null, { status: 304 });
  }
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("ETag", etag);
  const hasVersion = c.req.query("v");
  if (hasVersion) {
    headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=3600");
  } else {
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  }
  return new Response(obj.body, { headers });
});

app.get("/api/click/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.notFound();
  const link = await getLink(c.env.DB, id);
  if (!link) return c.notFound();
  c.executionCtx.waitUntil(
    (async () => {
      const hash = await visitorHash(c.req.raw);
      const ua = nullable(c.req.header("User-Agent"));
      const srcTag = nullable(c.req.query("src") || c.req.query("utm_source"));
      await recordClick(c.env.DB, id, {
        referer: nullable(c.req.header("Referer")),
        country: (c.req.raw as Request & { cf?: { country?: string | null } }).cf?.country ?? null,
        device: detectDevice(ua),
        visitorHash: hash,
        sourceTag: srcTag,
      });
      logger.info("link_click", { link_id: id, label: link.label });
    })(),
  );
  return c.redirect(link.url, 302);
});

// ---- OG image (static asset, generated at build time) ---------------------
// public/og.png is served by static assets; no runtime image processing.

// ---- Admin API (protected by Cloudflare Access + JWT verification) ------

app.use("/api/admin/*", async (c, next) => {
  const payload = await verifyAccess(c.env, c.req.raw);
  if (!payload) return c.json({ error: "Unauthorized" }, 403);
  const email = payload.email ?? "unknown";
  c.set("email", email);
  logger.info("admin_request", { email, method: c.req.method, path: new URL(c.req.url).pathname });
  await next();
});

app.get("/api/admin/data", async (c) => {
  const [profile, links] = await Promise.all([getProfile(c.env.DB), getLinks(c.env.DB)]);
  return c.json({ profile, links, email: c.get("email") });
});

app.put("/api/admin/profile", async (c) => {
  const body = await c.req.json<{
    orgName?: string;
    tagline?: string;
    accentColor?: string;
    socials?: unknown;
    theme?: Theme;
  }>();
  const profile = await updateProfile(c.env.DB, {
    orgName: body.orgName ? body.orgName.trim().slice(0, 60) : undefined,
    tagline: body.tagline !== undefined ? body.tagline.trim().slice(0, 140) : undefined,
    accentColor: body.accentColor,
    socials: body.socials,
    theme: body.theme ? parseTheme(JSON.stringify(body.theme)) : undefined,
  });
  c.executionCtx.waitUntil(invalidatePublicCache(c.env));
  logger.info("profile_updated", { email: c.get("email"), fields: Object.keys(body) });
  return c.json({ profile });
});

app.post("/api/admin/avatar", async (c) => {
  const body = await c.req.parseBody();
  const file = body["avatar"];
  if (!(file instanceof File)) return c.json({ error: "missing avatar file" }, 400);
  const ext = file.name.split(".").pop() ?? "png";
  const key = `avatar-${Date.now()}.${ext}`;
  await c.env.UPLOADS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });
  const profile = await getProfile(c.env.DB);
  if (profile.avatarKey && profile.avatarKey !== key) {
    await c.env.UPLOADS.delete(profile.avatarKey).catch(() => {});
  }
  await setAvatarKey(c.env.DB, key);
  c.executionCtx.waitUntil(invalidatePublicCache(c.env));
  logger.info("avatar_uploaded", { email: c.get("email"), key });
  return c.json({ key });
});

app.delete("/api/admin/avatar", async (c) => {
  const profile = await getProfile(c.env.DB);
  if (profile.avatarKey) {
    await c.env.UPLOADS.delete(profile.avatarKey).catch(() => {});
  }
  await clearAvatarKey(c.env.DB);
  c.executionCtx.waitUntil(invalidatePublicCache(c.env));
  logger.info("avatar_removed", { email: c.get("email") });
  return c.json({ ok: true });
});

app.post("/api/admin/banner", async (c) => {
  const body = await c.req.parseBody();
  const file = body["banner"];
  if (!(file instanceof File)) return c.json({ error: "missing banner file" }, 400);
  const ext = file.name.split(".").pop() ?? "png";
  const key = `banner-${Date.now()}.${ext}`;
  await c.env.UPLOADS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });
  const profile = await getProfile(c.env.DB);
  if (profile.bannerKey && profile.bannerKey !== key) {
    await c.env.UPLOADS.delete(profile.bannerKey).catch(() => {});
  }
  await setBannerKey(c.env.DB, key);
  c.executionCtx.waitUntil(invalidatePublicCache(c.env));
  logger.info("banner_uploaded", { email: c.get("email"), key });
  return c.json({ key });
});

app.delete("/api/admin/banner", async (c) => {
  const profile = await getProfile(c.env.DB);
  if (profile.bannerKey) {
    await c.env.UPLOADS.delete(profile.bannerKey).catch(() => {});
  }
  await clearBannerKey(c.env.DB);
  c.executionCtx.waitUntil(invalidatePublicCache(c.env));
  logger.info("banner_removed", { email: c.get("email") });
  return c.json({ ok: true });
});

interface LinkBody {
  label?: string;
  url?: string;
  icon?: string | null;
  highlight?: boolean;
  kind?: "link" | "event";
  startsAt?: number | null;
  endsAt?: number | null;
  location?: string | null;
  thumbnailKey?: string | null;
  status?: "auto" | "open" | "closed" | "sold_out" | "free_entry" | "invite_only" | "waitlist";
  categoryTag?: string | null;
  ctaText?: string | null;
  publishAt?: number | null;
  expiresAt?: number | null;
  archived?: number;
}

/** Deletes an R2 object, tolerating a missing object. */
async function deleteAsset(env: Env, key: string | null | undefined): Promise<void> {
  if (!key) return;
  await env.UPLOADS.delete(key).catch(() => {});
}

app.post("/api/admin/links", async (c) => {
  const body = await c.req.json<LinkBody>();
  if (!body.label?.trim() || !body.url?.trim()) return c.json({ error: "label and url are required" }, 400);
  const link = await createLink(c.env.DB, {
    label: body.label.trim(),
    url: body.url.trim(),
    icon: body.icon,
    highlight: body.highlight,
    kind: body.kind,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    location: body.location,
    thumbnailKey: body.thumbnailKey,
    status: body.status,
    categoryTag: body.categoryTag?.trim() || null,
    ctaText: body.ctaText?.trim() || null,
    publishAt: body.publishAt,
    expiresAt: body.expiresAt,
    archived: body.archived ?? 0,
  });
  c.executionCtx.waitUntil(invalidatePublicCache(c.env));
  logger.info("link_created", { email: c.get("email"), link_id: link.id, label: link.label });
  return c.json({ link });
});

app.put("/api/admin/links/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<LinkBody>();
  const previous = await getLink(c.env.DB, id);
  const link = await updateLink(c.env.DB, id, {
    label: body.label?.trim(),
    url: body.url?.trim(),
    icon: body.icon,
    highlight: body.highlight,
    kind: body.kind,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    location: body.location,
    thumbnailKey: body.thumbnailKey,
    status: body.status,
    categoryTag: body.categoryTag === undefined ? undefined : body.categoryTag?.trim() || null,
    ctaText: body.ctaText === undefined ? undefined : body.ctaText?.trim() || null,
    publishAt: body.publishAt,
    expiresAt: body.expiresAt,
    archived: body.archived,
  });
  if (!link) return c.notFound();
  // Replace-then-cleanup: drop the old thumbnail when it changed or was removed.
  if (previous?.thumbnailKey && previous.thumbnailKey !== link.thumbnailKey) {
    c.executionCtx.waitUntil(deleteAsset(c.env, previous.thumbnailKey));
  }
  c.executionCtx.waitUntil(invalidatePublicCache(c.env));
  logger.info("link_updated", { email: c.get("email"), link_id: id });
  return c.json({ link });
});

app.post("/api/admin/links/:id/duplicate", async (c) => {
  const id = Number(c.req.param("id"));
  const link = await duplicateLink(c.env.DB, id);
  if (!link) return c.notFound();
  c.executionCtx.waitUntil(invalidatePublicCache(c.env));
  logger.info("link_duplicated", { email: c.get("email"), original_id: id, new_id: link.id });
  return c.json({ link });
});

// Per-link thumbnail upload. Replaces (and deletes) any existing thumbnail.
app.post("/api/admin/links/:id/thumbnail", async (c) => {
  const id = Number(c.req.param("id"));
  const link = await getLink(c.env.DB, id);
  if (!link) return c.notFound();
  const body = await c.req.parseBody();
  const file = body["thumbnail"];
  if (!(file instanceof File)) return c.json({ error: "missing thumbnail file" }, 400);
  if (file.size > 5 * 1024 * 1024) return c.json({ error: "image must be under 5MB" }, 400);
  const ext = file.name.split(".").pop() ?? "png";
  const key = `thumb-${id}-${Date.now()}.${ext}`;
  await c.env.UPLOADS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });
  await updateLink(c.env.DB, id, { thumbnailKey: key });
  if (link.thumbnailKey && link.thumbnailKey !== key) {
    c.executionCtx.waitUntil(deleteAsset(c.env, link.thumbnailKey));
  }
  c.executionCtx.waitUntil(invalidatePublicCache(c.env));
  logger.info("thumbnail_uploaded", { email: c.get("email"), link_id: id, key });
  return c.json({ key });
});

app.delete("/api/admin/links/:id/thumbnail", async (c) => {
  const id = Number(c.req.param("id"));
  const link = await getLink(c.env.DB, id);
  if (!link) return c.notFound();
  await updateLink(c.env.DB, id, { thumbnailKey: null });
  c.executionCtx.waitUntil(deleteAsset(c.env, link.thumbnailKey));
  c.executionCtx.waitUntil(invalidatePublicCache(c.env));
  logger.info("thumbnail_removed", { email: c.get("email"), link_id: id });
  return c.json({ ok: true });
});

app.delete("/api/admin/links/:id", async (c) => {
  const id = Number(c.req.param("id"));
  // Delete the link's associated assets (thumbnail) along with the row.
  const link = await getLink(c.env.DB, id);
  await deleteLink(c.env.DB, id);
  if (link) c.executionCtx.waitUntil(deleteAsset(c.env, link.thumbnailKey));
  c.executionCtx.waitUntil(invalidatePublicCache(c.env));
  logger.info("link_deleted", { email: c.get("email"), link_id: id, thumbnail_deleted: !!link?.thumbnailKey });
  return c.body(null, 204);
});

app.post("/api/admin/links/reorder", async (c) => {
  const body = await c.req.json<{ ids: number[] }>();
  if (!Array.isArray(body.ids)) return c.json({ error: "ids required" }, 400);
  await reorderLinks(c.env.DB, body.ids);
  c.executionCtx.waitUntil(invalidatePublicCache(c.env));
  return c.json({ ok: true });
});

app.get("/api/admin/stats", async (c) => {
  const rangeParam = c.req.query("days");
  const rangeDays = rangeParam === "all" ? -1 : Number(rangeParam ?? 30) || 30;
  const windowDays = rangeDays > 0 ? rangeDays : 30;

  const [totals, daily, total, views, uniques, referrers, countries, devices, campaigns] = await Promise.all([
    getClickTotals(c.env.DB),
    getDailyClicks(c.env.DB, windowDays),
    getTotalClicks(c.env.DB, rangeDays > 0 ? rangeDays : undefined),
    getTotalViews(c.env.DB, rangeDays > 0 ? rangeDays : undefined),
    getUniqueVisitors(c.env.DB, rangeDays > 0 ? rangeDays : undefined),
    getReferrerBreakdown(c.env.DB, rangeDays > 0 ? rangeDays : 3650, new URL(c.req.url).origin, 10),
    getBreakdown(c.env.DB, "country", "clicks", windowDays, 10),
    getBreakdown(c.env.DB, "device", "clicks", windowDays, 10),
    getCampaignBreakdown(c.env.DB, windowDays, 10),
  ]);
  const ctr = views > 0 ? Math.round((total / views) * 1000) / 10 : 0;

  return c.json({
    totals,
    daily,
    total,
    views,
    uniques,
    ctr,
    referrers,
    countries,
    devices,
    campaigns,
    rangeDays,
  });
});

app.get("/api/admin/stats/export", async (c) => {
  const rangeParam = c.req.query("days");
  const rangeDays = rangeParam === "all" ? 3650 : Number(rangeParam ?? 30) || 30;
  const rows = await getAllClicks(c.env.DB, rangeDays);
  const csv = [
    "id,link,clicked_at,referer,country,device,source_tag",
    ...rows.map((r) =>
      [
        r.id,
        `"${String(r.link).replace(/"/g, '""')}"`,
        r.clicked_at,
        `"${String(r.referer ?? "").replace(/"/g, '""')}"`,
        String(r.country ?? ""),
        String(r.device ?? ""),
        `"${String(r.source_tag ?? "").replace(/"/g, '""')}"`,
      ].join(","),
    ),
  ].join("\n");
  return c.body(csv, 200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="analytics-${rangeDays}d.csv"`,
  });
});

app.get("/api/admin/backup", async (c) => {
  const [profile, links] = await Promise.all([getProfile(c.env.DB), getLinks(c.env.DB)]);
  return c.json({
    version: 1,
    exportedAt: Date.now(),
    profile,
    links,
  });
});

app.post("/api/admin/restore", async (c) => {
  const body = await c.req.json<{ profile?: Partial<Profile>; links?: Partial<LinkItem>[] }>();
  if (!body || (!body.profile && !body.links)) {
    return c.json({ error: "Invalid backup data" }, 400);
  }
  await restoreBackup(c.env.DB, { profile: body.profile ?? {}, links: body.links ?? [] });
  c.executionCtx.waitUntil(invalidatePublicCache(c.env));
  logger.info("backup_restored", { email: c.get("email") });
  return c.json({ ok: true });
});

// ---- Fallbacks -----------------------------------------------------------

app.notFound((c) => {
  const url = new URL(c.req.url);
  if (url.pathname.startsWith("/api/")) return c.json({ error: "Not found" }, 404);
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;