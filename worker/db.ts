import type { LinkItem, Profile } from "../src/lib/types";

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as number,
    orgName: (row.org_name as string) ?? "",
    tagline: (row.tagline as string) ?? "",
    avatarKey: (row.avatar_key as string | null) ?? null,
    accentColor: (row.accent_color as string) ?? "#6366f1",
    socials: JSON.parse((row.socials as string) ?? "[]"),
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
    createdAt: row.created_at as number,
  };
}

export async function getProfile(db: D1Database): Promise<Profile> {
  const res = await db
    .prepare("SELECT id, org_name, tagline, avatar_key, accent_color, socials, updated_at FROM profile WHERE id = 1")
    .first();
  if (!res) {
    await db.prepare("INSERT INTO profile (id) VALUES (1)").run();
    return getProfile(db);
  }
  return mapProfile(res as Record<string, unknown>);
}

export async function updateProfile(
  db: D1Database,
  fields: { orgName?: string; tagline?: string; accentColor?: string; socials?: unknown },
): Promise<Profile> {
  const current = await getProfile(db);
  const next = {
    orgName: fields.orgName ?? current.orgName,
    tagline: fields.tagline ?? current.tagline,
    accentColor: fields.accentColor ?? current.accentColor,
    socials: fields.socials ?? current.socials,
  };
  await db
    .prepare(
      "UPDATE profile SET org_name = ?, tagline = ?, accent_color = ?, socials = ?, updated_at = unixepoch() WHERE id = 1",
    )
    .bind(next.orgName, next.tagline, next.accentColor, JSON.stringify(next.socials))
    .run();
  return getProfile(db);
}

export async function setAvatarKey(db: D1Database, key: string): Promise<void> {
  await db.prepare("UPDATE profile SET avatar_key = ?, updated_at = unixepoch() WHERE id = 1").bind(key).run();
}

export async function clearAvatarKey(db: D1Database): Promise<void> {
  await db.prepare("UPDATE profile SET avatar_key = NULL, updated_at = unixepoch() WHERE id = 1").run();
}

export async function getLinks(db: D1Database): Promise<LinkItem[]> {
  const res = await db
    .prepare("SELECT id, label, url, icon, highlight, sort_order, created_at FROM links ORDER BY sort_order ASC, id ASC")
    .all();
  return (res.results as Record<string, unknown>[]).map(mapLink);
}

export async function getLink(db: D1Database, id: number): Promise<LinkItem | null> {
  const res = await db
    .prepare("SELECT id, label, url, icon, highlight, sort_order, created_at FROM links WHERE id = ?")
    .bind(id)
    .first();
  return res ? mapLink(res as Record<string, unknown>) : null;
}

export async function createLink(
  db: D1Database,
  fields: { label: string; url: string; icon?: string | null; highlight?: boolean },
): Promise<LinkItem> {
  const count = await db.prepare("SELECT COUNT(*) as n FROM links").first();
  const nextSort = ((count?.n as number) ?? 0) + 1;
  const res = await db
    .prepare(
      "INSERT INTO links (label, url, icon, highlight, sort_order) VALUES (?, ?, ?, ?, ?) RETURNING id, label, url, icon, highlight, sort_order, created_at",
    )
    .bind(fields.label, fields.url, fields.icon ?? null, fields.highlight ? 1 : 0, nextSort)
    .first();
  return mapLink(res as Record<string, unknown>);
}

export async function updateLink(
  db: D1Database,
  id: number,
  fields: { label?: string; url?: string; icon?: string | null; highlight?: boolean },
): Promise<LinkItem | null> {
  const current = await getLink(db, id);
  if (!current) return null;
  await db
    .prepare("UPDATE links SET label = ?, url = ?, icon = ?, highlight = ? WHERE id = ?")
    .bind(
      fields.label ?? current.label,
      fields.url ?? current.url,
      fields.icon === undefined ? current.icon : fields.icon,
      fields.highlight === undefined ? current.highlight : fields.highlight ? 1 : 0,
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

export async function recordClick(db: D1Database, linkId: number, referer: string | null): Promise<void> {
  await db
    .prepare("INSERT INTO clicks (link_id, referer) VALUES (?, ?)")
    .bind(linkId, referer ?? null)
    .run();
}

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
}

export async function getDailyClicks(db: D1Database, days: number): Promise<DailyRow[]> {
  const res = await db
    .prepare(
      `SELECT date(clicked_at, 'unixepoch') AS day, COUNT(*) AS clicks
       FROM clicks
       WHERE clicked_at >= unixepoch() - ?
       GROUP BY day
       ORDER BY day ASC`,
    )
    .bind(days * 86400)
    .all();
  return (res.results as Record<string, unknown>[]).map((r) => ({
    day: r.day as string,
    clicks: r.clicks as number,
  }));
}

export async function getTotalClicks(db: D1Database): Promise<number> {
  const res = await db.prepare("SELECT COUNT(*) as n FROM clicks").first();
  return (res?.n as number) ?? 0;
}