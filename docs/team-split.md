# Team split: Claude + Qwen (file ownership)

## Rules for both
1. One script at a time. Before every script: `git status --short` must be clean, then `git pull --rebase origin main`.
2. Edit ONLY files in your lane. To change a file in the other lane, ask Biki to relay the request.
3. New work goes in NEW files where possible. Existing shared files are append-only, inside a marked block (`/* qwen: name */` or `/* claude: name */`) guarded by `grep -q`, so scripts are idempotent.
4. Never `exit` (closes Termux). Never use /tmp (use $HOME). Never `cat >` over an existing file that is not yours.
5. Finish every script with: `bash tools/finish.sh "message"` (validates, bumps the service worker, pushes).
6. Tokens only, no raw hex outside token files. Every visible string bilingual (`data-en` / `data-bn`). Focus rings are never removed.
7. Checkpoint before risky work: `git tag -f pre-<task>`. Undo with `git reset --hard pre-<task>`.

## Claude lane (UI shell + home)
home.html, js/home*.js, css/home*.css, css/theme-v2.css, css/lessons.css, js/lessons.js, js/nav-extra.js, js/shell.js, css/shell.css, css/pwa.css, js/pwa.js.
Tasks: tracks and levels section, raised Study button, toasts and empty states, command-palette search, sign-in prompt after the first lesson, remembered lesson tabs.

## Qwen lane (typography, tokens, content, a11y)
css/tokens.css (append-only alias block), NEW css/typography-jp.css, auth-callback.html, js/quiz.js and js/placement.js (reduced-motion only), css/kanji.css, css/flashcards.css, css/quiz.css, css/progress.css, data/lessons/** (content), docs/**.
Tasks:
1. Remove the Tailwind CDN from auth-callback.html (replace with css/tailwind.css or the page's own CSS).
2. Japanese typography: new css/typography-jp.css. JP text 1.4x body, BN and EN subordinate (color var(--text-2)), furigana 0.55em. Load it on all content pages after theme-v2.css.
3. Add `--v2-*` aliases to tokens.css (append block), do NOT delete anything from theme-v2.css.
4. Reduced-motion check (window.NIHONGO_REDUCED_MOTION) in quiz.js and placement.js auto-advance.
5. Later: reading/listening questions, 3 grammar examples for lessons 3 to 6.

## Shared files (append-only, guarded)
sw.js: add PRECACHE lines only with `grep -q 'file' sw.js || sed -i "/^const PRECACHE = \[/a\\  'file'," sw.js`. Never touch VERSION by hand; finish.sh does it.
