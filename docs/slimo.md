# Slimo — engine, states, triggers

Slimo is the Nihongo·Bengali mascot. It is a floating widget mounted once per page
by `js/slimo.js`. Styling comes from `css/slimo.css`. Nothing else is modified.

## Files

- `js/slimo.js` — SVG, spring engine, state machine, activity interceptor, public API.
- `css/slimo.css` — tokens, layout, bubble, menu, reduced-motion.
- `tools/patch-slimo.mjs` — idempotent injector for every `.html`.
- `nihongo_slimo_prefs` — **local-only** localStorage key (never cloud-synced).

## Prefs (`nihongo_slimo_prefs`)

```jsonc
{
  "enabled": true,
  "size": "normal",       // "normal" | "small"
  "muted": false,
  "lastSeenDay": "2025-01-15",
  "recent": ["poke:1", "srsGood:2"]   // last 10 lines, avoids repeats
}
