/**
 * On-demand schema initialization.
 *
 * When D1 is auto-provisioned (GitHub / Deploy-to-Cloudflare flow) the database
 * is empty — no tables exist. The first request would otherwise 500 on every
 * query. `ensureSchema` creates the tables + singleton profile row lazily and
 * caches the result per isolate, so it only runs once.
 */
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    org_name TEXT NOT NULL DEFAULT '',
    tagline TEXT NOT NULL DEFAULT '',
    avatar_key TEXT,
    accent_color TEXT NOT NULL DEFAULT '#6366f1',
    socials TEXT NOT NULL DEFAULT '[]',
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT,
    highlight INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    clicked_at INTEGER NOT NULL DEFAULT (unixepoch()),
    referer TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_links_sort ON links(sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_clicks_link ON clicks(link_id)`,
  `CREATE INDEX IF NOT EXISTS idx_clicks_time ON clicks(clicked_at)`,
  `INSERT OR IGNORE INTO profile (id) VALUES (1)`,
];

let initialized = false;

export async function ensureSchema(db: D1Database): Promise<void> {
  if (initialized) return;
  await db.batch(SCHEMA_STATEMENTS.map((sql) => db.prepare(sql)));
  initialized = true;
}