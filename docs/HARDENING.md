# JP-Club hardening bundle — Termux guide

Node ≥ 22.18 is needed for `npm test` (TypeScript tests run on plain Node). Everything else runs on Node 18+.

## 0 · Install (once)

```bash
pkg update -y && pkg install -y nodejs-lts git unzip
termux-setup-storage
```

## 1 · Apply the bundle

```bash
cd ~/JP-Club && git pull
unzip -o ~/storage/downloads/jpclub-hardening.zip      # overlays files; nothing is deleted
node tools/apply-hardening.mjs --dry                    # preview the HTML/sw/cloud.js edits
node tools/apply-hardening.mjs                          # apply (idempotent — safe to re-run)
git status --short | head -50
```

Remove the dead, replaced files (the old tutor function split + the duplicate config):

```bash
git rm -r -q supabase/functions/ai-tutor/prompts supabase/functions/ai-tutor/providers supabase/functions/ai-tutor/utils
git rm -q supabase-config.js "tatusgit status" typography.css 2>/dev/null; true
```

Protect other pages / put the text-tutor widget on a page (optional):

```bash
node tools/apply-hardening.mjs --protect=tutor.html,progress.html
node tools/apply-hardening.mjs --wire-tutor=lesson.html
```

## 2 · Test locally

```bash
npm test                                   # 55 tests: parser, providers, handler, SSE client, sanitizers
node tools/build-data.mjs --check          # generated chunks match the sources
node tools/validate-data.mjs               # existing lesson validator
python3 -m http.server 8000 &              # then open http://localhost:8000/home.html in Chrome
```

## 3 · Supabase (once, from the dashboard + CLI)

1. **SQL Editor** → paste `sql/hardening.sql` → Run. Then run the two verify queries at the bottom of that file and delete any permissive policy you did not write.
2. **Authentication → URL Configuration**
   - Site URL: `https://biki76.github.io/JP-Club/`
   - Redirect URLs: `https://biki76.github.io/JP-Club/auth-callback.html` and `http://localhost:8000/auth-callback.html`
3. **Authentication → Providers → Email**: minimum password length 8+, enable *Secure password change*, keep *Confirm email* ON. **Auth → Attack Protection**: turn on CAPTCHA (Turnstile/hCaptcha) if sign-ups get abused.
4. **Edge function** (needs the Supabase CLI on a PC/laptop or CI; it does not run in Termux):

```bash
supabase secrets set GROQ_API_KEY=… GEMINI_API_KEY=… AI_PROVIDER=groq \
  ALLOWED_ORIGINS="https://biki76.github.io,http://localhost:8000"
supabase functions deploy ai-tutor        # leave "Verify JWT" ON
```

Model names change; check `AI_MODEL_GROQ` / `AI_MODEL_GEMINI` (defaults: `llama-3.3-70b-versatile`, `gemini-2.0-flash`).

## 4 · Config from .env

```bash
cp .env.example .env && nano .env
node --env-file=.env scripts/gen-config.mjs           # writes js/supabase-config.js
node --env-file=.env scripts/gen-config.mjs --check
git add -A && git commit -m "Auth + tutor + data hardening" && git push
```

## 5 · Rebuild data after editing a source file

```bash
node tools/build-data.mjs            # writes data/grammar/** and data/mimikara/vocab/**
git add data && git commit -m "rebuild data chunks" && git push
```

Rollback: `git revert <commit>` (or `git checkout -- .` before committing).

---

## What this does NOT do (read this)

- **No HttpOnly cookies.** GitHub Pages is static; nothing can set `Set-Cookie`. Supabase keeps the session in `localStorage`, so an XSS bug could read it. The CSP (`connect-src` allow-list, `object-src 'none'`, `base-uri 'self'`) and the escaping/`textContent` rules limit the damage, but the CSP still allows `'unsafe-inline'` scripts because the pages use inline pre-paint scripts and a few inline handlers. To remove that, move those scripts to files, then drop `'unsafe-inline'` from `script-src` in `tools/apply-hardening.mjs`. Real cookie sessions need a server (Cloudflare Worker / Supabase Edge proxy) — a different architecture.
- **The route guard is UX only.** Anyone can read the HTML/JS of a "protected" page. Real protection is RLS (`sql/hardening.sql`) and JWT checks in the edge functions.
- **The publishable key stays public.** `.env` keeps it out of hand-edited source, not out of the shipped JS. `service_role`, `GROQ_API_KEY`, `GEMINI_API_KEY` must only ever be Supabase secrets; `gen-config.mjs` refuses them.
- **Not covered:** `voice-tutor` and `voice-speak` still use `Access-Control-Allow-Origin: *`, have no rate limit, and return upstream error text to the browser. Port them to `_shared/cors.ts` + the rate limit in `lib/handler.ts` next.
- **Untested here:** the SQL, the Deno wrapper (`index.ts`), and everything in a real browser (no browser, no Postgres, no Deno in the build sandbox). The pure logic (parser, failover, handler, SSE client, sanitizers) is covered by `npm test`.

## Data findings (from `node tools/build-data.mjs`)

- Only two files were truly heavy: `data/mimikara/vocabulary.json` (357 KB, loaded by no page) and `content/grammar-ref.json` (276 KB, loaded whole by `grammar.html`). The Shin Kanzen files are 9 KB each, so they are only validated.
- Grammar page now loads a 72 KB (18 KB gzipped) index; extra examples load per lesson on demand.
- Splitting does not shrink the repo (sources stay, chunks are added); it shrinks what a visitor downloads. GitHub Pages already gzips JSON.
- 1517 of 1659 Mimikara entries have no `bengali_meaning`; `data/mimikara/manifest.json` says 880 words (and describes a 60-word file) but the file has 1659; 54 of 55 Shin Kanzen entries have no `example_jp`.
- Only 6 pages load `cloud.js`: flashcards, quiz, kanji, progress, placement and search do not, so writes there never reach the sync queue until a cloud-enabled page is opened.
