# Token-based themes, not freeform CSS

Theming is a curated token system: a set of preset themes, a Google Font
picker from a short list, and a palette (accent/surface/text/muted) with a
light/dark/system mode. All of it is stored as a `theme` JSON blob on the
profile row and mapped to CSS variables.

Freeform CSS was rejected: it would let an admin break the preset system,
require sanitization of arbitrary CSS, and turn every styling change into a
maintenance trap — the opposite of a polished, ownable page. Token-based
theming keeps the public page safe and consistent while still letting each org
make it their own.