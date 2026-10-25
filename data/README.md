# Lesson Data Layer

Every lesson is a **self-contained folder** under `data/lessons/`. The loader
fetches the folder's manifest, then the data files the manifest declares.



## Adding a lesson (files only — no JS/CSS/HTML changes)

1. `mkdir data/lessons/minna-002/`
2. Add `manifest.json` (schema below).
3. Add any of `vocabulary.json` / `grammar.json` / `kanji.json`.
4. Append `"minna-002/manifest.json"` to `data/lessons/index.json` → `manifests`.

The loader picks it up on next page load. No code edits.

> Note: `index.json` is a *data file*. It's the only non-folder-level change.
> A future build step could auto-generate it by scanning folders; until then it
> is maintained by hand, one line per lesson.

## Schemas

Full definitions in `js/data-schemas.js`. Summary:

### `vocabulary.json` — array of objects
| field | type | required |
|---|---|---|
| `id` | string | ✓ |
| `kanji` | string (omit for kana-only) | — |
| `furigana` | string (kana reading) | ✓ |
| `romaji` | string | — |
| `english_meaning` | string | ✓ |
| `bengali_meaning` | string | ✓ |
| `audio_url` | string | — |
| `tags` | string[] | — |

### `grammar.json` — array of objects
| field | type | required |
|---|---|---|
| `id` | string | ✓ |
| `pattern` | string | ✓ |
| `meaning_en` | string | ✓ |
| `meaning_bn` | string | ✓ |
| `examples` | array of `{ jp, furigana?, romaji?, en, bn }` (≥1) | ✓ |
| `notes` | `{ en, bn }` | — |
| `tags` | string[] | — |

### `kanji.json` — array of objects
| field | type | required |
|---|---|---|
| `character` | string (1–4) | ✓ |
| `onyomi` | string[] | ✓ |
| `kunyomi` | string[] | ✓ |
| `meanings` | `{ en: string[], bn: string[] }` | ✓ |
| `radicals` | string[] | ✓ |
| `strokes` | integer 1–64 | ✓ |
| `grade` | integer 1–9 | — |
| `jlpt` | `"N5" \| "N4" \| "N3" \| "N2" \| "N1"` | — |

### `manifest.json` — object
| field | type | required |
|---|---|---|
| `slug` | `[a-z0-9-]` | ✓ |
| `courseId` | string | ✓ |
| `lessonNumber` | integer ≥1 | ✓ |
| `title` | `{ en, bn }` | ✓ |
| `subtitle` | `{ en, bn }` | — |
| `jlpt` | `N5…N1` | — |
| `durationMin` | number ≥1 | — |
| `dataFiles` | `{ vocabulary?, grammar?, kanji? }` | ✓ |
| `tags` | string[] | — |

### `index.json` — object
| field | type | required |
|---|---|---|
| `courseId` | string | ✓ |
| `manifests` | string[] (relative manifest paths) | ✓ |

## Validate

```bash
node tools/validate-data.mjs
