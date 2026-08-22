# Build-time static OG image

The social-preview image (`og.png`) is rendered once at build time by
`scripts/gen-og.mjs` (satori + resvg) into a static asset, not generated per
request in the Worker.

Runtime rendering was rejected: satori's layout engine plus resvg's WASM
rasterizer consume far more than the free-tier 10ms CPU budget per request,
and the bundle weight would crowd the 3MB limit. The trade-off is that the
preview image reflects branding at deploy time, not live theme edits made in
the admin — OG meta *tags* (title/description) are still injected live from
the profile row.