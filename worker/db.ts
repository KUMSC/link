import type { LinkItem, LinkKind, Profile, Theme } from "../src/lib/types";
import { parseTheme } from "../src/lib/types";
import { deriveSource } from "./util";

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as number,
    orgName: (row.org_name as string) ?? "",
    tagline: (row.tagline as string) ?? "",
    avatarKey: (row.avatar_key as string | null) ?? null,
    bannerKey: (row.banner_key as string | null) ?? null,
    accentColor: (row.accent_color as string) ?? "#6366f1",
    socials: JSON.parse((row.socials as string) ?? "[]"),
    theme: parseTheme(row.theme as string | null | undefined),
    updatedAt: row.updated_at as number,
  };
}

function mapLink(row: Record<string, unknown>): LinkItem {
  return {
    id: row.id as number,
    label: row.label as string,
    url: row.url as string,
    icon: (row.icon as string | null) ?? null,
    highlight: (row.highlight as number) ?? 0,
    sortOrder: row.sort_order as number,
    kind: ((row.kind as string) ?? "link") as LinkKind,
    startsAt: (row.starts_at as number | null) ?? null,
    endsAt: (row.ends_at as number | null) ?? null,
    location: (row.location as string | null) ?? null,
    thumbnailKey: (row.thumbnail_key as string | null) ?? null,
    status: (row.status as LinkItem["status"]) ?? "auto",
    categoryTag: (row.category_tag as string | null) ?? null,
    ctaText: (row.cta_text as string | null) ?? null,
    createdAt: row.created_at as number,
  };
}

const PROFILE_COLS = "id, org_name, tagline, avatar_key, banner_key, accent_color, socials, theme, updated_at";
const LINK_COLS =
  "id, label, url, icon, highlight, sort_order, kind, starts_at, ends_at, location, thumbnail_key, status, category_tag, cta_text, created_at";

export async function getProfile(db: D1Database): Promise<Profile> {
  const res = await db.prepare(`SELECT ${PROFILE_COLS} FROM profile WHERE id = 1`).first();
  if (!res) {
    await db.prepare("INSERT INTO profile (id) VALUES (1)").run();
    return getProfile(db);
  }
  return mapProfile(res as Record<string, unknown>);
}

export interface ProfileUpdate {
  orgName?: string;
  tagline?: string;
  accentColor?: string;
  socials?: Profile["socials"];
  theme?: Theme;
}

export async function updateProfile(db: D1Database, fields: ProfileUpdate): Promise<Profile> {
  const current = await getProfile(db);
  const next = {
    orgName: fields.orgName ?? current.orgName,
    tagline: fields.tagline ?? current.tagline,
    accentColor: fields.accentColor ?? current.accentColor,
    socials: fields.socials ?? current.socials,
    theme: fields.theme ?? current.theme,
  };
  await db
    .prepare(
      "UPDATE profile SET org_name = ?, tagline = ?, accent_color = ?, socials = ?, theme = ?, updated_at = unixepoch() WHERE id = 1",
    )
    .bind(next.orgName, next.tagline, next.accentColor, JSON.stringify(next.socials), JSON.stringify(next.theme))
    .run();
  return getProfile(db);
}

export async function setAvatarKey(db: D1Database, key: string): Promise<void> {
  await db.prepare("UPDATE profile SET avatar_key = ?, updated_at = unixepoch() WHERE id = 1").bind(key).run();
}

export async function clearAvatarKey(db: D1Database): Promise<void> {
  await db.prepare("UPDATE profile SET avatar_key = NULL, updated_at = unixepoch() WHERE id = 1").run();
}

export async function setBannerKey(db: D1Database, key: string): Promise<void> {
  await db.prepare("UPDATE profile SET banner_key = ?, updated_at = unixepoch() WHERE id = 1").bind(key).run();
}

export async function clearBannerKey(db: D1Database): Promise<void> {
  await db.prepare("UPDATE profile SET banner_key = NULL, updated_at = unixepoch() WHERE id = 1").run();
}

export async function getLinks(db: D1Database): Promise<LinkItem[]> {
  const res = await db.prepare(`SELECT ${LINK_COLS} FROM links ORDER BY sort_order ASC, id ASC`).all();
  return (res.results as Record<string, unknown>[]).map(mapLink);
}

export async function getLink(db: D1Database, id: number): Promise<LinkItem | null> {
  const res = await db.prepare(`SELECT ${LINK_COLS} FROM links WHERE id = ?`).bind(id).first();
  return res ? mapLink(res as Record<string, unknown>) : null;
}

export interface LinkCreate {
  label: string;
  url: string;
  icon?: string | null;
  highlight?: boolean;
  kind?: LinkKind;
  startsAt?: number | null;
  endsAt?: number | null;
  location?: string | null;
  thumbnailKey?: string | null;
  status?: LinkItem["status"];
  categoryTag?: string | null;
  ctaText?: string | null;
}

export async function createLink(db: D1Database, fields: LinkCreate): Promise<LinkItem> {
  const count = await db.prepare("SELECT COUNT(*) as n FROM links").first();
  const nextSort = ((count?.n as number) ?? 0) + 1;
  const res = await db
    .prepare(
      `INSERT INTO links (label, url, icon, highlight, sort_order, kind, starts_at, ends_at, location, thumbnail_key, status, category_tag, cta_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING ${LINK_COLS}`,
    )
    .bind(
      fields.label,
      fields.url,
      fields.icon ?? null,
      fields.highlight ? 1 : 0,
      nextSort,
      fields.kind ?? "link",
      fields.startsAt ?? null,
      fields.endsAt ?? null,
      fields.location ?? null,
      fields.thumbnailKey ?? null,
      fields.status ?? "auto",
      fields.categoryTag ?? null,
      fields.ctaText ?? null,
    )
    .first();
  return mapLink(res as Record<string, unknown>);
}

export interface LinkUpdate {
  label?: string;
  url?: string;
  icon?: string | null;
  highlight?: boolean;
  kind?: LinkKind;
  startsAt?: number | null;
  endsAt?: number | null;
  location?: string | null;
  thumbnailKey?: string | null;
  status?: LinkItem["status"];
  categoryTag?: string | null;
  ctaText?: string | null;
}

export async function updateLink(db: D1Database, id: number, fields: LinkUpdate): Promise<LinkItem | null> {
  const current = await getLink(db, id);
  if (!current) return null;
  await db
    .prepare(
      `UPDATE links SET
        label = ?,
        url = ?,
        icon = ?,
        highlight = ?,
        kind = ?,
        starts_at = ?,
        ends_at = ?,
        location = ?,
        thumbnail_key = ?,
        status = ?,
        category_tag = ?,
        cta_text = ?
       WHERE id = ?`,
    )
    .bind(
      fields.label ?? current.label,
      fields.url ?? current.url,
      fields.icon === undefined ? current.icon : fields.icon,
      fields.highlight === undefined ? current.highlight : fields.highlight ? 1 : 0,
      fields.kind ?? current.kind,
      fields.startsAt === undefined ? current.startsAt : fields.startsAt,
      fields.endsAt === undefined ? current.endsAt : fields.endsAt,
      fields.location === undefined ? current.location : fields.location,
      fields.thumbnailKey === undefined ? current.thumbnailKey : fields.thumbnailKey,
      fields.status === undefined ? current.status ?? "auto" : fields.status,
      fields.categoryTag === undefined ? current.categoryTag : fields.categoryTag,
      fields.ctaText === undefined ? current.ctaText : fields.ctaText,
      id,
    )
    .run();
  return getLink(db, id);
}

export async function deleteLink(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM links WHERE id = ?").bind(id).run();
}

export async function reorderLinks(db: D1Database, ids: number[]): Promise<void> {
  await db.batch(ids.map((id, idx) => db.prepare("UPDATE links SET sort_order = ? WHERE id = ?").bind(idx + 1, id)));
}

export interface ClickContext {
  referer?: string | null;
  country?: string | null;
  device?: string | null;
  visitorHash?: string | null;
}

export async function recordClick(db: D1Database, linkId: number, ctx: ClickContext = {}): Promise<void> {
  await db
    .prepare("INSERT INTO clicks (link_id, referer, country, device, visitor_hash) VALUES (?, ?, ?, ?, ?)")
    .bind(linkId, ctx.referer ?? null, ctx.country ?? null, ctx.device ?? null, ctx.visitorHash ?? null)
    .run();
}

export async function recordView(db: D1Database, ctx: ClickContext): Promise<void> {
  await db
    .prepare("INSERT INTO views (visitor_hash, referer, country, device) VALUES (?, ?, ?, ?)")
    .bind(ctx.visitorHash ?? "", ctx.referer ?? null, ctx.country ?? null, ctx.device ?? null)
    .run();
}

// ---- Analytics ------------------------------------------------------------

export interface TotalsRow {
  link_id: number;
  label: string;
  url: string;
  total: number;
}

export async function getClickTotals(db: D1Database): Promise<TotalsRow[]> {
  const res = await db
    .prepare(
      `SELECT l.id AS link_id, l.label, l.url, COUNT(c.id) AS total
       FROM links l
       LEFT JOIN clicks c ON c.link_id = l.id
       GROUP BY l.id
       ORDER BY l.sort_order ASC, l.id ASC`,
    )
    .all();
  return (res.results as Record<string, unknown>[]).map((r) => ({
    link_id: r.link_id as number,
    label: r.label as string,
    url: r.url as string,
    total: r.total as number,
  }));
}

export interface DailyRow {
  day: string;
  clicks: number;
  views: number;
  uniques: number;
}

export async function getDailyClicks(db: D1Database, days: number): Promise<DailyRow[]> {
  const [clicks, views] = await Promise.all([
    db
      .prepare(
        `SELECT date(clicked_at, 'unixepoch') AS day, COUNT(*) AS clicks
         FROM clicks WHERE clicked_at >= unixepoch() - ?
         GROUP BY day`,
      )
      .bind(days * 86400)
      .all(),
    db
      .prepare(
        `SELECT date(viewed_at, 'unixepoch') AS day, COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS uniques
         FROM views WHERE viewed_at >= unixepoch() - ?
         GROUP BY day`,
      )
      .bind(days * 86400)
      .all(),
  ]);

  const clickMap = new Map<string, number>();
  for (const r of clicks.results as Record<string, unknown>[]) clickMap.set(r.day as string, r.clicks as number);
  const viewMap = new Map<string, { views: number; uniques: number }>();
  for (const r of views.results as Record<string, unknown>[]) {
    viewMap.set(r.day as string, { views: r.views as number, uniques: r.uniques as number });
  }

  // Fill the date series in JS (avoids SQLite's compound-SELECT term limit).
  const out: DailyRow[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const day = d.toISOString().slice(0, 10);
    const v = viewMap.get(day);
    out.push({
      day,
      clicks: clickMap.get(day) ?? 0,
      views: v?.views ?? 0,
      uniques: v?.uniques ?? 0,
    });
  }
  return out;
}

export async function getTotalClicks(db: D1Database, days?: number): Promise<number> {
  const res = days
    ? await db.prepare("SELECT COUNT(*) as n FROM clicks WHERE clicked_at >= unixepoch() - ?").bind(days * 86400).first()
    : await db.prepare("SELECT COUNT(*) as n FROM clicks").first();
  return (res?.n as number) ?? 0;
}

export async function getTotalViews(db: D1Database, days?: number): Promise<number> {
  const res = days
    ? await db.prepare("SELECT COUNT(*) as n FROM views WHERE viewed_at >= unixepoch() - ?").bind(days * 86400).first()
    : await db.prepare("SELECT COUNT(*) as n FROM views").first();
  return (res?.n as number) ?? 0;
}

export async function getUniqueVisitors(db: D1Database, days?: number): Promise<number> {
  const res = days
    ? await db
        .prepare("SELECT COUNT(DISTINCT visitor_hash) as n FROM views WHERE viewed_at >= unixepoch() - ?")
        .bind(days * 86400)
        .first()
    : await db.prepare("SELECT COUNT(DISTINCT visitor_hash) as n FROM views").first();
  return (res?.n as number) ?? 0;
}

export async function getBreakdown(
  db: D1Database,
  column: "referer" | "country" | "device",
  table: "clicks" | "views",
  days: number,
  limit = 10,
): Promise<{ key: string; count: number }[]> {
  const res = await db
    .prepare(
      `SELECT COALESCE(${column}, 'Unknown') AS key, COUNT(*) AS count
       FROM ${table} WHERE ${table === "views" ? "viewed_at" : "clicked_at"} >= unixepoch() - ?
       GROUP BY key ORDER BY count DESC LIMIT ?`,
    )
    .bind(days * 86400, limit)
    .all();
  return (res.results as Record<string, unknown>[]).map((r) => ({
    key: r.key as string,
    count: r.count as number,
  }));
}

/**
 * Referrer breakdown grouped by *normalized traffic source* rather than raw
 * URL, so instagram.com/… and l.facebook.com/… roll up to "Instagram" /
 * "Facebook", and self-referrals show as "(this page)" instead of the site's
 * own URL. Aggregated in JS from one row per distinct referer.
 */
export async function getReferrerBreakdown(
  db: D1Database,
  days: number,
  ownOrigin: string,
  limit = 10,
): Promise<{ key: string; count: number }[]> {
  const res = await db
    .prepare(
      `SELECT referer AS referer, COUNT(*) AS count
       FROM clicks WHERE clicked_at >= unixepoch() - ?
       GROUP BY referer`,
    )
    .bind(days * 86400)
    .all();
  const merged = new Map<string, number>();
  for (const r of res.results as Record<string, unknown>[]) {
    const label = deriveSource(r.referer as string | null, ownOrigin);
    merged.set(label, (merged.get(label) ?? 0) + (r.count as number));
  }
  return [...merged.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

export async function getAllClicks(db: D1Database, days: number): Promise<Record<string, unknown>[]> {
  const res = await db
    .prepare(
      `SELECT c.id, l.label AS link, c.clicked_at, c.referer, c.country, c.device
       FROM clicks c JOIN links l ON l.id = c.link_id
       WHERE c.clicked_at >= unixepoch() - ?
       ORDER BY c.clicked_at DESC`,
    )
    .bind(days * 86400)
    .all();
  return res.results as Record<string, unknown>[];
}