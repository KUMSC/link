-- Initial schema for the club link-in-bio platform.
-- Single-tenant: exactly one profile row (id = 1).

CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  org_name TEXT NOT NULL DEFAULT '',
  tagline TEXT NOT NULL DEFAULT '',
  avatar_key TEXT,
  accent_color TEXT NOT NULL DEFAULT '#6366f1',
  socials TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  highlight INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  link_id INTEGER NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at INTEGER NOT NULL DEFAULT (unixepoch()),
  referer TEXT
);

CREATE INDEX IF NOT EXISTS idx_links_sort ON links(sort_order);
CREATE INDEX IF NOT EXISTS idx_clicks_link ON clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_clicks_time ON clicks(clicked_at);

INSERT OR IGNORE INTO profile (id) VALUES (1);