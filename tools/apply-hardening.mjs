#!/usr/bin/env node
/* tools/apply-hardening.mjs — wires the hardening bundle into the existing repo. Idempotent.
 *
 *   node tools/apply-hardening.mjs --dry                 show what would change
 *   node tools/apply-hardening.mjs                       apply
 *   node tools/apply-hardening.mjs --protect=tutor.html,progress.html     pages that require a signed-in user
 *   node tools/apply-hardening.mjs --wire-tutor=lesson.html               add the text-tutor widget to a page
 *
 * Every edit is anchored on exact text. If an anchor is missing the edit is SKIPPED and reported,
 * nothing is guessed. Use git to review (`git diff --stat`) and to undo (`git checkout -- .`).
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const DRY = args.has('dry');
const PROTECT = String(args.get('protect') || 'tutor.html').split(',').map((s) => s.trim()).filter(Boolean);
const WIRE = args.get('wire-tutor') && args.get('wire-tutor') !== true ? String(args.get('wire-tutor')).split(',').map((s) => s.trim()) : [];

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",     // inline pre-paint scripts need 'unsafe-inline' (see docs)
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net",
  "worker-src 'self'", "manifest-src 'self'", "frame-src 'none'",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'",
].join('; ');

const log = [];
const note = (kind, file, msg) => log.push(`${kind.padEnd(5)} ${file}${msg ? ' — ' + msg : ''}`);

async function edit(rel, name, fn) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) return note('SKIP', rel, `${name}: file not found`);
  const before = await readFile(file, 'utf8');
  const after = fn(before);
  if (after === null) return note('SKIP', rel, `${name}: anchor not found`);
  if (after === before) return note('ok', rel, `${name}: already applied`);
  if (!DRY) await writeFile(file, after, 'utf8');
  note('EDIT', rel, name);
}

const SCRIPT = (p) => `<script src="${p}" defer></script>`;

/* ── 1. cloud.js: share one client + PKCE ── */
await edit('js/cloud.js', 'reuse shared client + PKCE', (s) => {
  if (s.includes('flowType')) return s;
  const a = "    if (client) return client;\n    if (!isConfigured() || !window.supabase) return null;";
  if (!s.includes(a)) return null;
  s = s.replace(a, "    if (client) return client;\n    if (window.__sb && window.__sb.auth) { client = window.__sb; return client; }   // shared with JPAuth\n    if (!isConfigured() || !window.supabase) return null;");
  const b = "auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }";
  if (!s.includes(b)) return null;
  return s.replace(b, "auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }");
});

/* ── 2. HTML pages ── */
const pages = (await readdir(ROOT)).filter((f) => f.endsWith('.html'));
for (const page of pages) {
  const text = await readFile(join(ROOT, page), 'utf8');
  const hasCloud = text.includes('src="js/cloud.js"');

  if (page !== 'dev-data-check.html') {
    await edit(page, 'CSP meta', (s) => {
      if (s.includes('http-equiv="Content-Security-Policy"')) return s;
      const m = /<meta charset[^>]*>/i.exec(s);
      return m ? s.replace(m[0], m[0] + `\n  <meta http-equiv="Content-Security-Policy" content="${CSP}">\n  <meta name="referrer" content="strict-origin-when-cross-origin">`) : null;
    });
  }

  if (hasCloud && page !== 'auth-callback.html') {
    await edit(page, 'sanitize.js + jp-auth.js', (s) => {
      if (s.includes('js/security/jp-auth.js')) return s;
      const a = SCRIPT('js/cloud.js');
      return s.includes(a) ? s.replace(a, `${a}\n  ${SCRIPT('js/security/sanitize.js')}\n  ${SCRIPT('js/security/jp-auth.js')}`) : null;
    });
  }

  if (PROTECT.includes(page)) {
    await edit(page, 'protected route (data-auth-required)', (s) => {
      if (s.includes('data-auth-required')) return s;
      const m = /<html\b([^>]*)>/i.exec(s);
      if (!m) return null;
      let out = s.replace(m[0], `<html${m[1]} data-auth-required>`);
      const hide = '<style>html[data-auth-required]:not([data-auth="ok"]):not([data-auth="offline"]) body{visibility:hidden}</style>';
      return out.replace('</head>', `  ${hide}\n</head>`);
    });
  }

  if (WIRE.includes(page)) {
    await edit(page, 'text-tutor widget', (s) => {
      if (s.includes('js/ai-tutor/widget.js')) return s;
      if (!s.includes('js/security/jp-auth.js') && !s.includes('src="js/cloud.js"')) return null;
      const css = ['css/ai-tutor.css', 'css/ai-tutor-stream.css'].map((h) => `<link rel="stylesheet" href="${h}">`).join('\n  ');
      const js = ['js/ai-tutor/utils.js', 'js/ai-tutor/storage.js', 'js/ai-tutor/state.js', 'js/ai-tutor/stream.js', 'js/ai-tutor/api.js',
        'js/ai-tutor/chat.js', 'js/ai-tutor/voice.js', 'js/ai-tutor/widget.js', 'js/ai-tutor/init.js'].map(SCRIPT).join('\n  ');
      return s.replace('</head>', `  ${css}\n</head>`).replace('</body>', `  ${js}\n</body>`);
    });
  }
}

/* ── 3. grammar page uses the chunk loader ── */
await edit('grammar.html', 'data-chunks.js before grammar-ref.js', (s) => {
  if (s.includes('js/data-chunks.js')) return s;
  const a = SCRIPT('js/grammar-ref.js');
  return s.includes(a) ? s.replace(a, `${SCRIPT('js/data-chunks.js')}\n${a}`) : null;
});
await edit('css/grammar-ref.css', 'buttons for paging / more examples', (s) => {
  if (s.includes('/* hardening: gr-more */')) return s;
  return s.replace(/\s*$/, '\n') + `
/* hardening: gr-more */
.gr-more { margin: .5rem 0; padding: .5rem 1rem; min-height: 40px; border: 1px solid var(--border); border-radius: 999px;
  background: var(--surface); color: var(--ink); font: inherit; cursor: pointer; }
.gr-more:hover { background: var(--surface-2, var(--surface)); }
.gr-more:disabled { opacity: .6; cursor: progress; }
.gr-more:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.gr-more--page { display: block; margin: 1rem auto; }
`;
});

/* ── 4. service worker: precache new scripts, bump version ── */
await edit('sw.js', 'precache new scripts + version bump', (s) => {
  if (s.includes("'js/security/jp-auth.js'")) return s;
  const a = "  'js/cloud.js',\n";
  if (!s.includes(a)) return null;
  s = s.replace(a, a + "  'js/security/sanitize.js',\n  'js/security/jp-auth.js',\n  'js/data-chunks.js',\n");
  return s.replace(/const VERSION\s*=\s*'v(\d+)'/, (_, n) => `const VERSION    = 'v${Number(n) + 1}'`);
});

/* ── 5. repo hygiene ── */
await edit('.gitignore', 'commit supabase-config.js, ignore .env', (s) => {
  const lines = s.split('\n').filter((l) => l.trim() !== 'js/supabase-config.js');
  if (!lines.some((l) => l.trim() === '.env')) lines.unshift('.env');
  return lines.join('\n').replace(/\n*$/, '\n');
});
await edit('package.json', 'scripts + main', (s) => {
  let j; try { j = JSON.parse(s); } catch { return null; }
  j.scripts = {
    ...j.scripts,
    'gen:config': 'node --env-file=.env scripts/gen-config.mjs',
    'build:data': 'node tools/build-data.mjs',
    'check:data': 'node tools/build-data.mjs --check && node tools/validate-data.mjs',
    'test': 'node tests/run-ts.mjs && node --test tests/stream.test.mjs tests/sanitize.test.mjs',
    'harden': 'node tools/apply-hardening.mjs',
  };
  if (j.main === 'supabase-config.example.js') delete j.main;
  return JSON.stringify(j, null, 2) + '\n';
});

console.log(log.join('\n'));
const skipped = log.filter((l) => l.startsWith('SKIP')).length;
console.log(`\n${DRY ? '(dry run) ' : ''}${log.filter((l) => l.startsWith('EDIT')).length} edit(s), ${skipped} skipped`);
if (skipped) console.log('Skipped edits need a manual look — see the messages above.');
