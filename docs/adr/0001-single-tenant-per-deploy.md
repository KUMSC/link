# Single-tenant-per-deploy

The app is one organization per deployment: a single `profile` row (id = 1),
one links list, one D1 database. A new club spins up a fresh copy of the repo.

We chose this over a multi-tenant platform (usernames, shared D1, public
signup) because the product's goal is a fast, focused, ownable club page on
Cloudflare's free tier, not a hosted SaaS. Multi-tenancy would rewrite the data
model, auth, and caching layers for a use case we don't have yet. If the
product later needs to host many orgs, the profile/links/clicks schema is
structured to be scoped by a tenant column.