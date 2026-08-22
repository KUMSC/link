# Club Link

A self-hostable link-in-bio platform for clubs and organizations, built 100% on Cloudflare's free tier. Deploy your own copy, set your branding, and share event forms, socials, and links from one page you own.

## Stack

- **Frontend**: Vite 8 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Backend**: Hono (Cloudflare Worker) via `@cloudflare/vite-plugin`
- **Data**: D1 (SQLite) · **Files**: R2 (avatar uploads)
- **Admin auth**: Cloudflare Access (free for up to 50 users)
- **Social preview**: build-time OG image (satori + resvg), no runtime image processing

## Project layout

```
worker/            Hono API: public page, click tracking, admin CRUD, Access JWT check
src/pages/         React SPA: PublicPage + admin dashboard (Links/Branding/Analytics)
src/components/ui/ shadcn components
migrations/        D1 schema (0001_init.sql) + seed data
scripts/gen-og.mjs Build-time OG image generator → public/og.png
public/            static assets (og.png, favicon.svg, robots.txt)
og.config.json     Branding used for the generated OG image
```

## Local development

Requires Node ≥ 22.22 (React Router 8 baseline).

```bash
npm install
npm run db:migrate:local    # apply schema to local D1
npm run db:seed:local       # seed sample profile + links
npm run dev                 # Vite dev server (Worker runs in workerd, HMR enabled)
```

In local dev, admin auth is **skipped** because `ACCESS_TEAM_DOMAIN`/`ACCESS_AUD`
are empty in `.dev.vars`. The public page is at `/`, the dashboard at `/admin`.

## Deploy

### Option A — Cloudflare UI / GitHub (recommended)

Cloudflare can **auto-provision** the D1 database and R2 bucket for you. In
`wrangler.jsonc`, `database_id` is intentionally **omitted** so the platform
creates the resources automatically and injects the real id on deploy.

1. Push this repo to GitHub (done).
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import repository**
   (or use the *Deploy to Cloudflare* button if the repo is public).
3. Cloudflare clones the repo, **auto-creates `club-link-db` + `club-link-uploads`**,
   and deploys. Subsequent pushes to the connected branch redeploy automatically.
4. Apply the schema to the remote database:
   ```bash
   npm run db:migrate:remote   # auto-resolves the provisioned D1 id
   npm run db:seed:remote
   ```
5. Set the two secrets (never auto-created):
   ```bash
   npx wrangler secret put ACCESS_TEAM_DOMAIN   # e.g. https://yourteam.cloudflareaccess.com
   npx wrangler secret put ACCESS_AUD           # your Access application AUD tag
   ```

### Option B — manual CLI

1. **Create D1 + R2 resources** (one-time):

```bash
npx wrangler d1 create club-link-db        # → copy the database_id
npx wrangler r2 bucket create club-link-uploads
```

2. Put the D1 `database_id` into `wrangler.jsonc` (or rely on `scripts/patch-db-id.mjs` to fetch it).

3. Set Access secrets so `/api/admin/*` is protected:

```bash
npx wrangler secret put ACCESS_TEAM_DOMAIN   # e.g. https://yourteam.cloudflareaccess.com
npx wrangler secret put ACCESS_AUD           # your Access application AUD tag
```

4. Deploy:

```bash
npm run deploy       # regenerates public/og.png, then builds worker + SPA and deploys
```

5. Apply the schema to the remote D1:

```bash
npm run db:migrate:remote
npm run db:seed:remote
```

> `db:migrate:remote` runs `scripts/patch-db-id.mjs` first, which fetches the
> D1 database id from your account if it isn't in the config yet — so the
> command works whether you created the DB manually or it was auto-provisioned.

## Protecting /admin with Cloudflare Access

Access gates `/admin*` at the edge so only your club's members reach the dashboard.

1. Cloudflare dashboard → Zero Trust → **Access → Applications** → **Add an application** → *Self-hosted*.
2. Application domain: `*.workers.dev` or your custom domain; set **path** to `/admin` and **path match** to *Regex*, include rule `^/admin(?:/.*)?$` plus `^/api/admin/.*$`.
3. Policy: *Allow*, selector **Emails** → add club members' addresses (or your org's IdP group). Session duration e.g. 24h.
4. Under **Additional settings**, copy the **Application Audience (AUD) Tag** → use as the `ACCESS_AUD` secret above.

The Worker also verifies the `Cf-Access-Jwt-Assertion` JWT on every `/api/admin/*`
request (defense-in-depth), so the API stays locked even if the Worker is reached directly.

> **Free plan note**: Cloudflare Access is free for up to 50 users.

## OG / social preview

`npm run build` runs `scripts/gen-og.mjs`, which renders `public/og.png` (1200×630)
from `og.config.json`. The Worker injects live `og:title` / `og:description` meta
from the admin-set profile at request time; the image is the static file.

To regenerate after changing branding in `og.config.json`:

```bash
npm run gen:og
```

## Deploying for another organization

This is single-tenant-per-deploy by design: one copy = one club's page. To spin up
a new club, deploy the repo again under a new Worker name, point it at fresh D1/R2
resources, update `og.config.json` + `migrations/seed.sql`, and re-run the deploy
steps. All content (links, socials, branding, avatar) is managed by the club admins
in the dashboard afterward.

## Free-tier budget

| Resource | Our usage | Free limit |
|---|---|---|
| Worker requests | hundreds/day | 100,000/day |
| CPU | ~2–5ms (Hono + D1) | 10ms/request |
| D1 reads / writes | few per request / 1 per click | 5M / 100K per day |
| R2 | <10MB avatar | 10GB |
| Bundle (gzip) | ~26KB worker | 3MB |
| Access | ≤50 club members | free |