# Voice functions · data gaps · deploying the tutor (browser)

## A. Voice functions (fixed)

Files (paste into the Supabase dashboard, one at a time):
- `supabase/functions/voice-speak/index.ts`  → Edge Functions → voice-speak → Code → Deploy
- `supabase/functions/voice-tutor/index.ts`  → Edge Functions → voice-tutor → Code → Deploy

Keep **Verify JWT** ON for both. Secrets (Project Settings → Edge Functions → Secrets):

| Name | Value |
|---|---|
| `GROQ_API_KEY` | your Groq key (voice-tutor) |
| `CF_ACCOUNT_ID`, `CF_API_TOKEN` | Cloudflare (voice-speak) |
| `ALLOWED_ORIGINS` | `https://biki76.github.io,http://localhost:8000` |

What changed: upstream errors go to the server log only; the browser gets a generic
message and a `requestId`. CORS is an allow-list. Per-user rate limit, timeouts and
input caps were added. Existing clients keep working: they still read `error`, `audio`
and `reply`.

Tests: `node tests/voice/run-voice.mjs` (11 tests, no network).

## B. Data gaps

    node tools/fill-gaps.mjs report              # writes data-gaps/*.json worklists
    # fill "bengali_meaning" / example fields in a batch file, then:
    node tools/fill-gaps.mjs merge data-gaps/mimikara-batch-01.json
    node tools/build-data.mjs                    # rebuild chunks after merging Mimikara

The merge refuses placeholders, English in Bengali fields, unknown ids and silent
overwrites, and writes nothing if any entry fails.

Status when this was built:
- Mimikara: 1517 of 1659 entries (all N3) have no `bengali_meaning`. The
  `bengali_glossary.json` (699 entries) does **not** overlap these words, so it can't fill them.
- Shin Kanzen: 54 of 55 entries have no example sentence. The manifest says the book has
  54 lessons, but `grammar.json` holds only 55 points.

These are translations. They need a reviewer, so the tool does not generate them.

## C. Deploying the tutor function from a browser (desktop mode)

No Supabase CLI needed. Use the dashboard.

1. Dashboard → **Edge Functions** → **Deploy a new function** → name `ai-tutor`.
2. Build the single file on your laptop (or in Termux, same command):
   `node tools/bundle-ai-tutor.mjs` → creates `dist/ai-tutor.single.ts`.
   Open that file, copy everything, and paste it into the dashboard editor
   (replace the default `index.ts`). The file is ~36 KB and imports only the Supabase client.
3. Keep **Verify JWT** ON → Deploy.
4. Project Settings → Edge Functions → Secrets: add the variables from the table in section A,
   plus `AI_PROVIDER=groq`.
5. Test from the function's **Invoke** tab with an `Authorization: Bearer <a user access token>`
   header and body `{"action":"get_sessions"}`. Expect `{"success":true,"data":[]}`.

Run `sql/hardening.sql` in the SQL Editor **before** step 5, since the function reads the new tables.
