# Link in Bio

A self-hostable link-in-bio platform for clubs and organizations, built 100% on Cloudflare's free tier. Deploy your own copy, set your branding, and share event passes, forms, socials, and links from one clean page you control.

---

## Features

- **Public Page & Identity Studio** — Circular avatar, 140-character clamped tagline, mobile-first labeled social handles, categorized link feed, and physical event ticket passes.
- **Instant Search & Category Filter Chips** — Fast real-time client-side search across labels, locations, and category tags (`All`, `Events`, `Spotlight`, and custom tags).
- **Physical Event Ticket Passes** — Crisp ticket layout with perforated tear notches, category tags, start/end dates, location, and customizable RSVP status badges (`Open`, `Closed`, `Sold Out`, `Free Entry`, `Invite Only`, `Waitlist`).
- **Live Event Countdown Tickers** — Real-time countdown clock on tickets (`Starts in 2d 14h`, `Starts in 45m`, `Live Now`, `Concluded`).
- **Add to Calendar Engine** — 1-click Google Calendar URL generation and downloadable RFC 5545 Apple / Outlook `.ics` calendar files.
- **Unified Sharing & QR Modal** — Single clean modal with high-precision vector SVG QR code, 1-click link copying, SVG QR download for posters, and native Web Share API trigger.
- **Link Scheduling & Auto-Expiry** — Publish At and Expire At date-time pickers with automatic visibility filtering on the public page, archive support, and status badges in admin.
- **1-Click Link & Event Duplication** — Clone any link or event ticket directly from the admin dashboard.
- **Themes & Styling Studio** — 6 presets (light and dark palettes), Google Font typography selection, 4-color palette editor, card radius and shadow customization, and live Light/Dark mode preview switcher.
- **Analytics & Campaign Tracking** — Page views, unique visitors (privacy-friendly hashed daily uniques), clicks, CTR, geographic locations, user devices, top referrers, and campaign source tags (`?src=`, `?utm_source=`); 7/30/90/all-time ranges; CSV export.
- **Backup & Disaster Recovery** — 1-click JSON snapshot export and full restore capability.
- **Admin Auth & Security** — Cloudflare Access (free for up to 50 users) with edge and Worker-side JWT signature verification.

---

## Stack

- **Frontend**: Vite 8 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui + Lucide Icons
- **Backend**: Hono (Cloudflare Worker) via `@cloudflare/vite-plugin`
- **Database**: Cloudflare D1 (SQLite) with auto-healing schema migrations
- **Asset Storage**: Cloudflare R2 (avatar, cover banner, and event thumbnail uploads)
- **Edge Caching**: Cloudflare Workers KV for public payloads (auto-invalidated on admin mutations)
- **Admin Auth**: Cloudflare Access (free for up to 50 team members)
- **Social Preview**: Build-time static Open Graph image generation (`satori` + `resvg`), zero runtime image compute

---

## Project Layout

```
worker/               Hono API: public bootstrap, click tracking, admin CRUD, Access JWT check
worker/db.ts          D1 query layer, link scheduling, click/view recording, backups
worker/schema.ts      Idempotent schema definitions and column backfills
src/pages/            React SPA: PublicPage + Admin dashboard (Links, Branding, Analytics)
src/components/ui/    shadcn UI components
migrations/           D1 SQL migration files and seed datasets
scripts/gen-og.mjs    Build-time Open Graph image generator -> public/og.png
public/               Static assets (og.png, favicon.svg, robots.txt)
og.config.json        Branding configuration used for static OG generation
```

---

## Local Development

Requires Node >= 22.22.

```bash
# 1. Install dependencies
npm install

# 2. Apply migrations to local D1 SQLite
npm run db:migrate:local

# 3. Seed sample club profile and links
npm run db:seed:local

# 4. Start local development server with HMR
npm run dev
```

In local development, admin authentication is bypassed because `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are unset in `.dev.vars`. The public page is served at `http://localhost:5173/`, and the admin dashboard is at `http://localhost:5173/admin`.

---

## Deployment

Refer to [DEPLOYMENT.md](DEPLOYMENT.md) for complete, step-by-step instructions.

### Quick Deploy Steps

1. **Enable R2 (One-Time)**:
   In your Cloudflare Dashboard, navigate to **R2** and click **Activate R2** (required for the free tier storage buckets).

2. **Deploy via GitHub / Cloudflare Dashboard**:
   - Cloudflare Dashboard -> **Workers & Pages** -> **Create** -> **Import repository**.
   - Cloudflare automatically creates `link-db` (D1) and `link-uploads` (R2) and deploys your Worker.

3. **Apply Remote Database Schema**:
   ```bash
   npm run db:migrate:remote
   npm run db:seed:remote
   ```

4. **Configure Cloudflare Access for Admin Protection**:
   - Cloudflare Dashboard -> **Zero Trust** -> **Access** -> **Applications** -> **Add an application** (*Self-hosted*).
   - Set Path Rule to `/admin*` and `/api/admin/*`.
   - Copy your **Application Audience (AUD) Tag** and set Worker secrets:
     ```bash
     npx wrangler secret put ACCESS_TEAM_DOMAIN   # e.g. https://yourteam.cloudflareaccess.com
     npx wrangler secret put ACCESS_AUD           # your Access Application Audience tag
     ```

---

## Campaign & UTM Tracking

You can track traffic sources without compromising visitor privacy by appending `?src=`, `?utm_source=`, or `?ref=` to your public link:

- `https://yourclub.workers.dev/?src=instagram_bio`
- `https://yourclub.workers.dev/?src=poster_qr`
- `https://yourclub.workers.dev/?src=discord_announcement`

Traffic sources are aggregated in the **Analytics** tab under the **Campaign Tags** card and included in CSV exports.

---

## Free-Tier Budget

| Resource | App Usage | Free Limit |
|---|---|---|
| Worker Requests | Hundreds / day | 100,000 / day |
| CPU Time | ~2-5ms (Hono + D1) | 10ms / request |
| D1 Reads / Writes | Few per request / 1 per click | 5M reads / 100K writes per day |
| R2 Storage | <10MB profile & card assets | 10GB / month |
| Admin Access Auth | Club executive team | 50 users free |
| Workers Logs | Structured JSON events | 200,000 events / day |

---

## Observability & Logging

Structured JSON logging is enabled by default. To stream live production logs:

```bash
npx wrangler tail link
```

Event types emitted:
- `request`: method, path, status, duration_ms
- `link_click`: link_id, label, source_tag
- `admin_request`: authenticated email, method, path
- `profile_updated`, `avatar_uploaded`, `link_created`, `link_updated`, `link_deleted`, `backup_restored`
- `unhandled_error`: error message, stack, path