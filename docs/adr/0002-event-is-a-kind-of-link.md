# Event is a kind of Link

Events are modeled as rows in the `links` table with `kind = 'event'` plus
`starts_at`, `ends_at`, and `location`, rather than a separate `events` table.

Keeping events in the links table means click tracking, ordering, icons, and
the public list renderer all work for events with zero duplicated machinery —
an event click is a Link click by definition. A separate table would have
forced a second set of click/analytics queries and a union when rendering the
page. Event-specific behavior (countdown card) is a presentation concern that
sits on top of the same row.