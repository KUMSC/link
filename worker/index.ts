import { Hono } from "hono";
import type { Env } from "./env";
import { verifyAccess } from "./access";
import {
  clearAvatarKey,
  createLink,
  deleteLink,
  getClickTotals,
  getDailyClicks,
  getLink,
  getLinks,
  getProfile,
  getTotalClicks,
  reorderLinks,
  recordClick,
  setAvatarKey,
  updateLink,
  updateProfile,
} from "./db";
import { injectBootstrap, injectMeta } from "./meta";
import { ensureSchema } from "./schema";
import { logger } from "./log";

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

// SPA shell with live OG meta injected. Served before static assets on "/".
app.get("/", async (c) => {
  const [profile, links] = await Promise.all([getProfile(c.env.DB), getLinks(c.env.DB)]);
  const origin = new URL(c.req.url).origin;
  const assetRes = await c.env.ASSETS.fetch(c.req.raw);
  let html = await assetRes.text();
  html = injectMeta(html, profile, origin);
  html = injectBootstrap(html, profile, links);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Never cache the HTML shell: it references hashed assets and must always
      // point at the current deployment, or the SPA 404s on old hashes.
      "Cache-Control": "no-store, max-age=0",
    },
  });
});

// ---- Public API ----------------------------------------------------------

app.get("/api/public", async (c) => {
  const [profile, links] = await Promise.all([getProfile(c.env.DB), getLinks(c.env.DB)]);
  return c.json({ profile, links });
});

app.get("/api/avatar", async (c) => {
  const profile = await getProfile(c.env.DB);
  if (!profile.avatarKey) return c.notFound();
  const obj = await c.env.UPLOADS.get(profile.avatarKey);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=3600");
  return new Response(obj.body, { headers });
});

app.get("/api/click/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.notFound();
  const link = await getLink(c.env.DB, id);
  if (!link) return c.notFound();
  c.executionCtx.waitUntil(
    (async () => {
      await recordClick(c.env.DB, id, c.req.header("Referer") ?? null);
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
  }>();
  const profile = await updateProfile(c.env.DB, {
    orgName: body.orgName,
    tagline: body.tagline,
    accentColor: body.accentColor,
    socials: body.socials,
  });
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
  logger.info("avatar_uploaded", { email: c.get("email"), key });
  return c.json({ key });
});

app.delete("/api/admin/avatar", async (c) => {
  const profile = await getProfile(c.env.DB);
  if (profile.avatarKey) {
    await c.env.UPLOADS.delete(profile.avatarKey).catch(() => {});
  }
  await clearAvatarKey(c.env.DB);
  logger.info("avatar_removed", { email: c.get("email") });
  return c.json({ ok: true });
});

app.post("/api/admin/links", async (c) => {
  const body = await c.req.json<{ label: string; url: string; icon?: string | null; highlight?: boolean }>();
  if (!body.label?.trim() || !body.url?.trim()) return c.json({ error: "label and url are required" }, 400);
  const link = await createLink(c.env.DB, {
    label: body.label.trim(),
    url: body.url.trim(),
    icon: body.icon,
    highlight: body.highlight,
  });
  logger.info("link_created", { email: c.get("email"), link_id: link.id, label: link.label });
  return c.json({ link });
});

app.put("/api/admin/links/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ label?: string; url?: string; icon?: string | null; highlight?: boolean }>();
  const link = await updateLink(c.env.DB, id, {
    label: body.label?.trim(),
    url: body.url?.trim(),
    icon: body.icon,
    highlight: body.highlight,
  });
  if (!link) return c.notFound();
  logger.info("link_updated", { email: c.get("email"), link_id: id });
  return c.json({ link });
});

app.delete("/api/admin/links/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteLink(c.env.DB, id);
  logger.info("link_deleted", { email: c.get("email"), link_id: id });
  return c.body(null, 204);
});

app.post("/api/admin/links/reorder", async (c) => {
  const body = await c.req.json<{ ids: number[] }>();
  if (!Array.isArray(body.ids)) return c.json({ error: "ids required" }, 400);
  await reorderLinks(c.env.DB, body.ids);
  return c.json({ ok: true });
});

app.get("/api/admin/stats", async (c) => {
  const [totals, daily, total] = await Promise.all([
    getClickTotals(c.env.DB),
    getDailyClicks(c.env.DB, 30),
    getTotalClicks(c.env.DB),
  ]);
  return c.json({ totals, daily, total });
});

// ---- Fallbacks -----------------------------------------------------------

app.notFound((c) => {
  const url = new URL(c.req.url);
  if (url.pathname.startsWith("/api/")) return c.json({ error: "Not found" }, 404);
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;