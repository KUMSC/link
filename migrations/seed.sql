-- Sample seed data. Adjust before first deploy.
UPDATE profile SET
  org_name = 'My Organization',
  tagline = 'Latest events, forms & socials',
  accent_color = '#6366f1',
  socials = '[
    {"platform": "instagram", "url": "https://instagram.com/you"},
    {"platform": "twitter", "url": "https://x.com/you"}
  ]',
  updated_at = unixepoch()
WHERE id = 1;

INSERT OR IGNORE INTO links (id, label, url, icon, highlight, sort_order) VALUES
  (1, 'Event Registration Form', 'https://forms.google.com/your-event-form', NULL, 1, 1),
  (2, 'Join', 'https://forms.google.com/your-join-form', NULL, 0, 2),
  (3, 'Website', 'https://your-org.example.com', NULL, 0, 3);