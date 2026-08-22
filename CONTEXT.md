# Link in Bio — Club Context

A single-organization link-in-bio page for clubs: one page showing an org's
links, upcoming events, socials, and branding, with click/visit analytics.
Deployed on Cloudflare's free tier (Workers + D1 + R2 + KV). Single-tenant per
deploy — one profile row per deployment.

## Language

**Profile**:
The single organization row (id = 1) holding name, tagline, avatar, socials, and theme.
_Avoid_: account, user, org settings

**Link**:
A clickable item on the public page with a label and destination URL. Every link
is tracked when clicked.
_Avoid_: button, tile

**Event**:
A Link bound to a time and optional place (starts_at, ends_at, location), shown
as a card (optionally with countdown). Clicks on events count as Link clicks.
_Avoid_: event link, scheduled link

**Click**:
An activation of a Link, attributed to country, device, referrer, and a hashed visitor id.
_Avoid_: hit, tap

**View**:
A single page load, stored as a hashed-daily-unique row so the system can
compute unique visitors and click-through rate without persisting raw PII.
_Avoid_: pageview count, impression

**Theme**:
The brand tokens — preset, font family, mode (light/dark/system), and palette —
that drive the page's CSS variables. Token-based only; no freeform CSS.
_Avoid_: styles, css, skin

**Social**:
A named social profile link (platform + URL) rendered as an icon.
_Avoid_: handle, icon link