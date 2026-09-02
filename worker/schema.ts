/**
 * On-demand schema initialization.
 *
 * When D1 is auto-provisioned (GitHub / Deploy-to-Cloudflare flow) the database
 * is empty — no tables exist. `ensureSchema` creates everything lazily and
 * caches per isolate. For already-provisioned DBs (rolled out before new
 * columns existed) it also idempotently adds missing columns via
 * `pragma_table_info` + guarded `ALTER TABLE ADD COLUMN`, so both fresh and
 * existing deployments converge on the same schema.
 */

const CREATE_STATEMENTS = [
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

// Columns to backfill on existing databases (table -> [column defs]).
const COLUMN_ADDITIONS: Record<string, string[]> = {
  profile: ["theme TEXT NOT NULL DEFAULT '{}'", "banner_key TEXT", "favicon_key TEXT"],
  links: [
    "kind TEXT NOT NULL DEFAULT 'link'",
    "starts_at INTEGER",
    "ends_at INTEGER",
    "location TEXT",
    "thumbnail_key TEXT",
    "status TEXT DEFAULT 'auto'",
    "category_tag TEXT",
    "cta_text TEXT",
    "publish_at INTEGER",
    "expires_at INTEGER",
    "archived INTEGER NOT NULL DEFAULT 0",
  ],
  clicks: ["country TEXT", "device TEXT", "visitor_hash TEXT", "source_tag TEXT"],
  views: ["source_tag TEXT"],
};

const EXTRA_CREATES = [
  `CREATE TABLE IF NOT EXISTS views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_hash TEXT NOT NULL,
    viewed_at INTEGER NOT NULL DEFAULT (unixepoch()),
    referer TEXT,
    country TEXT,
    device TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_views_time ON views(viewed_at)`,
];

let initialized = false;

export async function ensureSchema(db: D1Database): Promise<void> {
  if (initialized) return;

  await db.batch([...CREATE_STATEMENTS, ...EXTRA_CREATES].map((sql) => db.prepare(sql)));

  for (const [table, columns] of Object.entries(COLUMN_ADDITIONS)) {
    const existing = await db.prepare(`SELECT name FROM pragma_table_info(?)`).bind(table).all();
    const names = new Set((existing.results as { name: string }[]).map((r) => r.name));
    const adds = columns.filter((def) => {
      const col = def.split(" ")[0]!;
      return !names.has(col);
    });
    if (adds.length > 0) {
      await db.batch(adds.map((def) => db.prepare(`ALTER TABLE ${table} ADD COLUMN ${def}`)));
    }
  }

  initialized = true;
}