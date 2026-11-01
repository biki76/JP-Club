# Handoff to Qwen (supersedes docs/team-split.md: Qwen now owns ALL lanes)

## Project
Nihongo-Bengali: bilingual (Bengali/English) Japanese learning site for Bengali speakers. Vanilla HTML/CSS/JS, no build step, Supabase optional sync, PWA. Live: https://biki76.github.io/JP-Club (GitHub Pages, subpath /JP-Club/). Repo: github.com/biki76/JP-Club, branch main. Read context.md and docs/context-phase13.md first.

## Owner's environment (hard constraints)
- Works ONLY from a phone in Termux, folder ~/JP-Club. No desktop, no editor.
- Every reply = ONE paste-ready bash script in ONE code block, at most one line of text above it. No long explanations.
- /tmp is not writable: use $HOME. NEVER use `exit` (it closes Termux).
- Scripts must be idempotent: guard with `grep -q` or marker comments, so running twice changes nothing.
- Start every script with: `cd ~/JP-Club && git status --short && git pull --rebase origin main`
- Prefer NEW files. Edit existing files with guarded node/sed patches. Never overwrite a file with `cat >` unless you created it.
- Run `node --check` on every JS file you write.
- Add each new asset to the service worker: `grep -q 'path' sw.js || sed -i "/^const PRECACHE = \[/a\\  'path'," sw.js`. Never edit VERSION by hand.
- End every script with: `bash tools/finish.sh "short message"` (regenerates status.json, validates data, bumps SW version, commits, pushes).
- Checkpoint before risky work: `git tag -f pre-<task>`. Undo: `git reset --hard pre-<task>`.
- After each push the owner waits ~1 minute, taps Reload on the update banner (the SW serves CSS/JS cache-first), and sends screenshots. Wait for them before the next task.

## Code rules
- Tokens only: `var(--token)`, no raw hex outside css/tokens*.css and css/theme-v2.css. Tokens live in tokens.css, tokens-extra.css, theme-v2.css (`--v2-*`).
- Every visible string is bilingual: `<span data-en="..." data-bn="...">`. Language is read as `localStorage.nihongo_lang || document.documentElement.lang`.
- Focus rings are never removed: `outline:2px solid var(--focus); outline-offset:2px`.
- Honor `prefers-reduced-motion` (JS flag: `window.NIHONGO_REDUCED_MOTION`).
- Cloud writes only through the Storage.prototype.setItem interceptor in js/cloud.js. Never call Supabase from page code.
- Content pages load, in order: tokens.css, tokens-extra.css, design-system.css, shell.css, a11y.css, pwa.css, theme-v2.css, home-fix.css (home only), page css.

## Tools (in repo)
- tools/finish.sh, gen-status.mjs, bump-sw.mjs, validate-data.mjs
- tools/apply-fix.mjs (patch.json: grammarFix, grammarAdd, practiceAdd, kanjiReplace, manifestTitles, vocabAdd), apply-practice.mjs
- tools/export-fix.mjs, export-misc.mjs, export-practice.mjs, audit-fix.mjs, selfhost-fonts.mjs

## Current state (all pushed unless noted)
- Phases 0-12 done; Phase 13: lessons.html course map, theme-v2 design layer, compiled Tailwind (css/tailwind.css is tiny because pages barely use utilities), self-hosted fonts, data for all 50 lessons (validator PASS, status.json 50 ready).
- Home page fully styled and verified by screenshot (hero with dynamic CTA, tracks, JLPT strip, path cards).
- Install banner lifted above bottom nav; hero/section spacing fixed.
- LAST COMMAND, result not yet verified: js/study-btn.js (raised "Study" centre button in bottom nav, relabels the flashcards link), js/toast.js (window.Toast.show(en, bn, {type:'ok|err|info', ms}); offline/online toasts), CSS appended to theme-v2.css, scripts added to all pages. First action: ask the owner for a screenshot of the bottom nav and run `git log --oneline | head -3` to confirm it pushed.

## Hard-won lessons (do not repeat)
- CLASS-NAME MISMATCH: js/home.js renders `.book`, `.jlpt-card`, `.path` but old home.css styled `.book-card`, `.jlpt-chip`, `.path-card`. The fix lives in css/home-fix.css. Before styling any section, grep the class names the JS actually renders against the CSS.
- Undefined CSS variables silently break layout (--sidebar-w, --header-h, --s-7 ...). Check with a script before blaming layout rules.
- Termux paste can drop lines; keep scripts self-contained and verify with a grep at the end.
- data/lessons/index.json lists plain slugs; DataLoader.loadCourse maps them to <slug>/manifest.json (already patched).
- Chrome "Desktop site" mode makes phone screenshots look like the desktop layout.
- Qwen's earlier batch-1 script (auth-callback Tailwind removal, css/typography-jp.css, --v2 aliases in tokens.css) was never reviewed or run by Claude. Re-generate it fresh as Task 2/3 below.

## Task queue (do in order, one per reply, wait for owner's screenshot/output)
1. Verify study button + toast (above). Fix anything broken.
2. Japanese typography: new css/typography-jp.css, JP text 1.4x body, BN/EN subordinate (var(--text-2)), furigana rt 0.55em, keep line-height tokens. Link after theme-v2.css on all content pages.
3. auth-callback.html: remove the Tailwind CDN script; use css/tailwind.css or its own styles.
4. Empty states: progress.html (no activity), bookmarks (lesson page), search (no results), flashcards (nothing due): icon + one-line message + one CTA, bilingual.
5. Command-palette search: `/` or Ctrl+K on desktop, a bottom sheet from the header search icon on mobile. Overlay with results from vocabulary, kanji and lessons (reuse data from DataLoader), keyboard navigable, Esc closes, role="dialog" aria-modal, focus trap, returns focus on close. Also fix `shell:search` so it navigates to search.html?q=...
6. Sign-in prompt: after the first "Mark lesson complete", if not signed in, show a toast/sheet "Save your streak across devices" (bn: "সব ডিভাইসে স্ট্রিক সেভ রাখুন") linking to auth.html. Show once (localStorage flag nihongo_signin_prompted, local only).
7. Lesson page: remember the last open tab per lesson (localStorage key nihongo_lesson_tab, local only); default Vocabulary.
8. Reduced motion in js/quiz.js and js/placement.js auto-advance: use window.NIHONGO_REDUCED_MOTION (disable delay animations).
9. Tokens: add a marked alias block in tokens.css mapping --v2-* to base tokens. Do NOT delete anything from theme-v2.css.
10. Content: grammar lessons 3-6 have 1 example per item (target 3); reading/listening have 1 item per lesson with no questions (add 3 comprehension questions each, same option format as practice). Use the DeepSeek pattern: write an export command + a DeepSeek prompt that returns one bash script using tools/apply-fix.mjs (extend it if needed).
11. Later phases (ask the owner first): grammar reference page (grammar.html: search/filter grammar across all lessons by JLPT/lesson), Mimikara Oboeru course, Shin Kanzen Master tracks.

## Known open items
- og.png / icon-192.png / icon-512.png not generated (only SVG).
- No audio files: audio_url empty, TTS fallback works.
- Home hero "Continue" card reads nihongo_progress; verify after completing a lesson.
- Merge-check: css/home-fix.css, theme-v2.css and tokens-extra.css were added additively; do not rewrite them wholesale.

## Review gate
After every task give the owner a 3-line test checklist (what to open, what to see). If the owner reports a bug, fix it before starting the next task.
