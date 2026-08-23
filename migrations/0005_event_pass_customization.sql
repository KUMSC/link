-- 0005_event_pass_customization.sql
-- Add status, category_tag, and cta_text columns to links for event passes
ALTER TABLE links ADD COLUMN status TEXT DEFAULT 'auto';
ALTER TABLE links ADD COLUMN category_tag TEXT;
ALTER TABLE links ADD COLUMN cta_text TEXT;
