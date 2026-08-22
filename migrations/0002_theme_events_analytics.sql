-- Theme, events, and richer analytics (2026).
-- profile.theme: JSON brand tokens {preset, fontFamily, mode, palette}
-- links.kind: 'link' | 'event'; event links carry starts_at/ends_at/location
-- clicks: geo/device/visitor attribution columns
-- views: page-load tracking for uniques + CTR

ALTER TABLE profile ADD COLUMN theme TEXT NOT NULL DEFAULT '{}';

ALTER TABLE links ADD COLUMN kind TEXT NOT NULL DEFAULT 'link';
ALTER TABLE links ADD COLUMN starts_at INTEGER;
ALTER TABLE links ADD COLUMN ends_at INTEGER;
ALTER TABLE links ADD COLUMN location TEXT;

ALTER TABLE clicks ADD COLUMN country TEXT;
ALTER TABLE clicks ADD COLUMN device TEXT;
ALTER TABLE clicks ADD COLUMN visitor_hash TEXT;

CREATE TABLE IF NOT EXISTS views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_hash TEXT NOT NULL,
  viewed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  referer TEXT,
  country TEXT,
  device TEXT
);

CREATE INDEX IF NOT EXISTS idx_views_time ON views(viewed_at);