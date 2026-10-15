# dashupdate — turning Link-in-Bio into a multi-tenant SaaS

**Status:** plan, not yet implemented.
**Decided:** shared D1 with `tenant_id` · Better Auth on D1 · subdomains first, custom
domains later · free beta with billing hooks pre-wired.

Today the app is single-tenant by design ([ADR 0001](adr/0001-single-tenant-per-deploy.md)):
one `profile` row pinned to `id = 1`, one D1, one deploy per club. This document is the
path from that to `sabin.dashupdate.com` — many sites, one deploy.

---

## 1. The shape

| Host | Serves | Auth |
| --- | --- | --- |
| `dashupdate.com`, `www` | Marketing site, pricing, signup CTA | none |
| `app.dashupdate.com` | Dashboard: login, site list, editor, analytics | Better Auth session cookie |
| `<slug>.dashupdate.com` | The public link page (today's `PublicPage`) | none |
| `fallback.dashupdate.com` | Origin for customer custom hostnames (phase 3) | none |

**The admin UI moves off the tenant subdomain to `app.dashupdate.com`.** This is the single
most valuable structural decision in this plan: the session cookie is scoped to exactly one
host, is never transmitted to a tenant subdomain, and CSRF/cookie-scoping across `*.dashupdate.com`
stops being a class of bug you can have. Tenant subdomains serve public HTML and nothing else.

Editing a site is `app.dashupdate.com/s/<slug>/links`, not `<slug>.dashupdate.com/admin`.

### DNS and routing

On the `dashupdate.com` zone:

```
A/AAAA  @      proxied     (or CNAME to the worker)
CNAME   www    proxied
CNAME   app    proxied
AAAA    *      100::       proxied      # wildcard for every tenant
```

Universal SSL covers `dashupdate.com` and `*.dashupdate.com` — one label deep, which is all
`sabin.dashupdate.com` needs. No per-tenant certificate work, no provisioning delay, free.

Worker routes: `dashupdate.com/*`, `*.dashupdate.com/*`. One Worker, one assets bundle;
the host header picks the surface. Split the marketing site out to its own Worker later if
it grows — not now.

**Config change required:** `wrangler.jsonc` currently sets
`"run_worker_first": ["/", "/api/*"]`. The public page must be worker-first on every path a
tenant can be reached at, so this becomes `"run_worker_first": true` with the Worker falling
through to `env.ASSETS` for anything it does not own.

---

## 2. Data model

One D1, `tenant_id` on every row, every query scoped. Chosen over database-per-tenant because
it is a migration rather than a rewrite, and over Durable Objects because the read path is
already KV-cached and does not need the isolation.

### New tables

```sql
CREATE TABLE users (              -- Better Auth owns this shape
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  name TEXT, image TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
-- plus Better Auth's `session`, `account`, `verification` tables

CREATE TABLE tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,             -- lowercased; the subdomain label
  owner_id TEXT NOT NULL REFERENCES users(id),
  plan TEXT NOT NULL DEFAULT 'free',     -- free | pro
  status TEXT NOT NULL DEFAULT 'active', -- active | suspended | deleted
  custom_domain TEXT UNIQUE,             -- phase 3
  custom_domain_status TEXT,             -- pending | active | failed
  cache_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX idx_tenants_slug ON tenants(slug);

CREATE TABLE memberships (               -- room for teams without a later migration
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',    -- owner | editor
  PRIMARY KEY (tenant_id, user_id)
);
```

### Changed tables

`profile` loses `CHECK (id = 1)` and becomes one row per tenant, keyed by `tenant_id`.
`links`, `clicks`, `views` each gain `tenant_id INTEGER NOT NULL`.

Indexes are the whole performance story on a shared D1 — every one of these is required,
not optional:

```sql
CREATE INDEX idx_links_tenant_sort   ON links(tenant_id, sort_order);
CREATE INDEX idx_clicks_tenant_time  ON clicks(tenant_id, clicked_at);
CREATE INDEX idx_views_tenant_time   ON views(tenant_id, viewed_at);
CREATE INDEX idx_clicks_link         ON clicks(link_id);
```

`clicks.tenant_id` is denormalized (derivable via `link_id`) on purpose: analytics queries
filter by tenant and time and must never join to `links` to do it.

### Migrating the existing deploy

Migration `0008_multitenant.sql` runs in this order, and is safe on a live single-tenant DB:

1. Create `users`, `tenants`, `memberships` and the Better Auth tables.
2. Insert the operator as `users` row 1 and the existing site as `tenants` row 1 (`slug = 'kumsc'`).
3. `ALTER TABLE ... ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT 1` on `links`, `clicks`, `views`.
4. Rebuild `profile` with the new primary key, copying row 1 in as `tenant_id = 1`.
5. Drop the old single-column indexes, create the composite ones.

The `DEFAULT 1` is what makes step 3 a no-downtime backfill. Drop the default in a follow-up
migration once the code always writes `tenant_id` explicitly.

### Retire the self-healing schema

`worker/schema.ts` runs `CREATE TABLE IF NOT EXISTS` + `pragma_table_info` + guarded
`ALTER TABLE` on the first request of every isolate. That existed for the Deploy-to-Cloudflare
button, where D1 arrives empty. A SaaS has one database that you migrate deliberately —
running DDL at request time against shared production data is a liability, and the
`initialized` module global means every cold isolate pays for it.

**Delete `ensureSchema` and the middleware that calls it.** `wrangler d1 migrations apply`
becomes the only way schema changes reach production.

---

## 3. Tenant resolution

A single middleware, running before everything else, that turns a `Host` header into a tenant:

```ts
// worker/tenant.ts
export async function resolveTenant(env: Env, host: string): Promise<Tenant | null>
```

1. Strip the port, lowercase, split off the label before `.dashupdate.com`.
2. If the label is in `RESERVED_SLUGS`, this is not a tenant request — hand it to the app/marketing router.
3. Look the slug up in KV (`tenant:<slug>`, 60s TTL). On a miss, hit D1 and populate.
4. `status = 'suspended'` → `410 Gone` with a static notice. `deleted` / not found → the
   "this page doesn't exist, claim it" page, which doubles as an acquisition surface.

The KV lookup is what keeps the public page at one D1 read per cache miss rather than two.

`RESERVED_SLUGS` must exist before the first signup — reclaiming a slug from a user is
painful. At minimum:

```
www app api admin dashboard account billing login signup auth
docs blog help support status mail smtp cdn assets static
og img files staging dev test fallback ns1 ns2 _dmarc
```

Slug rules: `^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$`, no leading/trailing hyphen, no
`--` (punycode collision), and a profanity/impersonation denylist for brand-adjacent names.

---

## 4. Tenant scoping in the data layer — the correctness core

`worker/db.ts` has ~30 exported functions that all query unscoped today. This is where a
multi-tenant bug becomes a data breach, so the fix must be enforced by the compiler rather
than by discipline.

**Every function takes `tenantId` as a required second parameter, immediately after `db`.**
Not optional, not defaulted, not last. Making it required means TypeScript flags all ~60 call
sites in `worker/index.ts` the moment you change the signature — the migration is
"fix every compile error," which is a finite, checkable task, and a forgotten call site
cannot ship.

Two spots that are outright vulnerabilities the moment two tenants exist:

- `GET /api/click/:id` — `getLink(db, id)` with no tenant check. Any tenant's link id,
  clicked from any host, redirects and attributes the click. Must become
  `getLink(db, tenant.id, id)` returning null on mismatch.
- `GET /api/thumb/:id` — same pattern, leaks another tenant's uploaded image.

Consider a thin `TenantScope` wrapper (`scope.links.all()`, `scope.clicks.since(t)`) as a
second layer, but the required-parameter change is the one that actually buys safety.

### Cache keys

`worker/util.ts` hardcodes `CACHE_KEY = "public"` — a shared global that would serve one
tenant's page to another. It becomes `public:<tenantId>:<cacheVersion>`, where `cacheVersion`
is the counter on `tenants`. Invalidation is then a single `UPDATE tenants SET cache_version
= cache_version + 1` instead of a KV delete, which sidesteps KV's eventual-consistency
window — a bumped version can never read a stale value, whereas a delete can.

### R2 keys

Keys are currently flat (`avatar-<ts>.png`) and would collide across tenants.
Namespace them: `t/<tenantId>/avatar-<ts>.png`. Prefix namespacing also makes
"delete this tenant's data" a `list({prefix})` + `delete()` loop, which you need for
account deletion anyway.

---

## 5. Auth (Better Auth)

Cloudflare Access is the wrong tool the moment signup is public — it is an IdP gate for a
team of up to 50, not a user system. It comes out entirely, except optionally as the gate on
a `/staff` superadmin surface, where its "small fixed team" model is exactly right.

- Better Auth on the same D1 (Kysely D1 dialect or Drizzle), sessions in D1 with a KV read cache.
- Email + password, plus Google and GitHub OAuth.
- Transactional email via Resend for verification and password reset — the one non-Cloudflare
  dependency, and unavoidable.
- Cookie scoped to `app.dashupdate.com` only. Never `.dashupdate.com`.
- Authorization is a separate check from authentication: after the session resolves,
  `memberships` decides whether this user may touch this `tenant_id`. Every `/api/admin/*`
  route takes the tenant from the **path**, then verifies membership — never from a header
  or a client-supplied body field.

Signup flow: email → verify → claim slug (live availability check against `tenants` +
`RESERVED_SLUGS`) → tenant row + seeded `profile` created in one transaction → redirect to
the editor.

---

## 6. Per-tenant OG images

[ADR 0003](adr/0003-build-time-static-og-image.md) generates one `og.png` at build time via
satori + resvg. That cannot survive multi-tenancy — every site needs its own card, and there
is no build step per tenant.

Generate on write, not on read: when a tenant saves branding, a `waitUntil` task renders the
card with satori + resvg-wasm and writes `t/<id>/og.png` to R2. `/og.png` on a tenant host
streams that object; tenants who have never saved get a generic fallback.

**This requires the Workers Paid plan.** The free plan's 10ms CPU budget cannot render a PNG;
the paid plan's 30s ceiling can. Given that Paid also lifts D1 to 10GB (from 500MB), unlocks
Queues and Cron, and costs $5/month, treat it as a launch prerequisite rather than a
tradeoff to agonize over. If you want to stay free longer, ship an SVG-only OG card — some
scrapers handle it, Slack and iMessage do not.

---

## 7. Analytics at multi-tenant scale

`clicks` and `views` store one row per event, forever, for every tenant. On the shared D1 that
is the table that will hit the size ceiling first, and D1 is single-threaded per database —
a slow unindexed analytics scan by one tenant degrades everyone's page loads.

1. **Now:** the composite `(tenant_id, time)` indexes above. Non-negotiable.
2. **At launch:** a nightly Cron Trigger that rolls events older than 90 days into
   `stats_daily(tenant_id, day, link_id, clicks, views, uniques)` and deletes the raw rows.
   Retention becomes a plan feature: 30 days free, 365 on pro.
3. **When volume warrants it:** move raw event *writes* to Workers Analytics Engine — built
   for high-cardinality append-only telemetry, queried over its SQL API — and leave D1 holding
   only configuration. This is the escape hatch that means a traffic spike never threatens
   the config database.

---

## 8. Abuse — do not defer this

A hosted link-in-bio product is a phishing and malware redirector with a friendly UI. Cloudflare
will act on abuse reports against your zone, and a wildcard domain with open signup gets
found fast. Minimum viable defenses, all before public launch:

- **Outbound URL screening** on link save — Cloudflare's URL Scanner API or Google Safe
  Browsing. Flag rather than block; queue for review.
- **Suspension path** end to end: `tenants.status = 'suspended'` → `410` immediately, cache
  version bumped, one admin action. Build it before you need it at 2am.
- **Signup rate limiting** by IP via the Workers Rate Limiting binding; email verification
  required before a tenant can publish.
- **An abuse report endpoint** and a real contact address on every public page footer.
  Its absence is what turns one bad tenant into a zone-level action.
- **Interstitial warning** on redirect for links younger than 24h on free tenants — cheap,
  and it destroys the drive-by phishing use case.

---

## 9. Plans and billing hooks

No payment integration yet, but the enforcement points go in now so adding Stripe later is
one module and not a refactor:

```ts
// worker/plans.ts
export const LIMITS = {
  free: { links: 25, customDomain: false, analyticsDays: 30, uploadsMb: 10 },
  pro:  { links: 500, customDomain: true, analyticsDays: 365, uploadsMb: 200 },
} as const;
```

Checked in the create/update handlers against `tenants.plan`. When billing lands, a webhook
flips `plan` and everything else already respects it.

---

## 10. Custom domains (phase 3)

Cloudflare for SaaS is bundled with non-Enterprise plans — confirm the current included
hostname allotment and per-hostname overage on Cloudflare's plan comparison before you price
a tier on it, since that number moves.

Flow: tenant enters `links.sabin.com` → `POST /custom_hostnames` via the API → show them the
CNAME (to `fallback.dashupdate.com`) and the DCV TXT record → a cron polls hostname status →
`custom_domain_status = 'active'` → the tenant resolver gains a second lookup path keyed on
`custom_domain`. Cache that lookup in KV the same way as slugs.

---

## 11. Phases

**P0 — Multi-tenancy under the hood (no user-visible change).**
Zone + wildcard DNS · `resolveTenant` middleware + reserved slugs · migration 0008 ·
`tenantId` required through all of `db.ts` · tenant-scoped cache and R2 keys ·
delete `ensureSchema` · `run_worker_first: true`.
Ships as "a single tenant that happens to be tenant 1," fully deployable and testable
against the existing site before any user can sign up.

**P1 — Signup and the dashboard.**
Better Auth · `app.dashupdate.com` shell with a site list · slug claim flow · move the
existing admin UI under `/s/:slug/*` and behind membership checks · retire Cloudflare Access.

**P2 — SaaS hygiene.** Per-tenant OG · plan limits · abuse tooling and suspension ·
rate limits · retention cron · tenant export and hard delete.

**P3 — Money.** Stripe or Polar · plan gating on the pro features · custom hostnames.

**P4 — Growth.** Teams via `memberships` · templates · a public API · the claim-this-slug
page as an acquisition funnel.

P0 is the only phase with real architectural risk. P1–P4 are additive.

---

## 12. File-by-file for P0

| File | Change |
| --- | --- |
| `wrangler.jsonc` | `run_worker_first: true`; add `CACHE` KV as a required binding, not optional |
| `worker/tenant.ts` | **new** — `resolveTenant`, `RESERVED_SLUGS`, slug validation |
| `worker/env.ts` | `CACHE` becomes required; drop `ACCESS_*` in P1 |
| `worker/schema.ts` | **delete** — migrations only |
| `worker/db.ts` | required `tenantId` on all ~30 exports; composite-index-friendly WHERE clauses |
| `worker/util.ts` | `CACHE_KEY` → `public:<tenantId>:<version>`; `invalidatePublicCache` → version bump |
| `worker/index.ts` | host router (marketing / app / tenant); thread tenant through ~60 call sites; fix `/api/click/:id` and `/api/thumb/:id` scoping; R2 key prefixes |
| `worker/meta.ts` | `injectMeta` takes the tenant origin and per-tenant OG URL |
| `migrations/0008_multitenant.sql` | **new** — see §2 |
| `docs/adr/0005-*.md` | supersedes 0001 |
| `docs/adr/0006-*.md` | supersedes 0003 |
| `CONTEXT.md` | "Profile" is no longer the single org row; add "Tenant" and "User" to the language section |

---

## 13. Open risks

- **Cross-tenant leakage** is the only bug class that is fatal rather than annoying. Mitigation
  is the required-parameter signature change plus a test that seeds two tenants and asserts
  every public and admin endpoint returns tenant A nothing belonging to tenant B. Write that
  test in P0, not P2.
- **Single D1 is single-threaded.** A hot tenant or a slow analytics query is everyone's
  problem. The composite indexes plus KV caching on the read path are the mitigation; the
  escape hatch is Analytics Engine (§7), and beyond that, sharding tenants across several D1s
  keyed by `tenants.shard` — which the `tenant_id` model leaves open.
- **The free plan runs out** at OG rendering and the 500MB D1 ceiling. Budget $5/month.
- **Wildcard SSL is one label deep.** `a.b.dashupdate.com` is not covered. Do not offer nested slugs.
