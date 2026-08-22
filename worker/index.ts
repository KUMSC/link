import { Hono } from "hono";
import type { Env } from "./env";
import { verifyAccess } from "./access";
import {
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
import { injectMeta } from "./meta";

type Bindings = Env;

type AppEnv = {
  Bindings: Bindings;
  Variables: { email: string };
};

const app = new Hono<AppEnv>();

// SPA shell with live OG meta injected. Served before static assets on "/".
app.get("/", async (c) => {
  const profile = await getProfile(c.env.DB);
  const origin = new URL(c.req.url).origin;
  const assetRes = await c.env.ASSETS.fetch(c.req.raw);
  const html = injectMeta(await assetRes.text(), profile, origin);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
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
  c.executionCtx.waitUntil(recordClick(c.env.DB, id, c.req.header("Referer") ?? null));
  return c.redirect(link.url, 302);
});

// ---- OG image (static asset, generated at build time) ---------------------
// public/og.png is served by static assets; no runtime image processing.

// ---- Admin API (protected by Cloudflare Access + JWT verification) ------

app.use("/api/admin/*", async (c, next) => {
  const payload = await verifyAccess(c.env, c.req.raw);
  if (!payload) return c.json({ error: "Unauthorized" }, 403);
  c.set("email", payload.email ?? "unknown");
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
  return c.json({ key });
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
  return c.json({ link });
});

app.delete("/api/admin/links/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await deleteLink(c.env.DB, id);
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