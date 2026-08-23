-- Migration: Scheduling (publish_at, expires_at, archived) and Campaign / UTM source tracking
ALTER TABLE links ADD COLUMN publish_at INTEGER;
ALTER TABLE links ADD COLUMN expires_at INTEGER;
ALTER TABLE links ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clicks ADD COLUMN source_tag TEXT;
ALTER TABLE views ADD COLUMN source_tag TEXT;
