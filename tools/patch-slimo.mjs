#!/usr/bin/env node
/* ==========================================================
   tools/patch-slimo.mjs
   Idempotently adds css/slimo.css + js/slimo.js (defer, after
   cloud.js) to every .html file in the project. Removes any
   previous Slimo includes. Safe to run repeatedly.
   Usage: node tools/patch-slimo.mjs
   ========================================================== */
import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git', '.github', 'dist', 'build', '.cache']);

async function walk(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) { await walk(full, out); }
    else if (e.isFile() && /\.html?$/i.test(e.name)) { out.push(full); }
  }
  return out;
}

function relUrl(file, target) {
  let rel = relative(dirname(file), target).split(sep).join('/');
  if (!rel.startsWith('.') && !rel.startsWith('/')) rel = './' + rel;
  return rel;
}

const RE_LINK = /<link\b[^>]*\bhref\s*=\s*["'][^"']*slimo\.css[^"']*["'][^>]*>\s*/gi;
const RE_SCRIPT = /<script\b[^>]*\bsrc\s*=\s*["'][^"']*slimo\.js[^"']*["'][^>]*>\s*<\/script>\s*/gi;
const RE_CLOUD = /(<script\b[^>]*\bsrc\s*=\s*["'][^"']*cloud\.js[^"']*["'][^>]*>\s*<\/script>)/i;

async function patch(file) {
  let html = await readFile(file, 'utf8');
  const before = html;

  // strip previous Slimo includes (any path)
  html = html.replace(RE_LINK, '');
  html = html.replace(RE_SCRIPT, '');

  const cssHref = relUrl(file, join(ROOT, 'css', 'slimo.css'));
  const jsSrc   = relUrl(file, join(ROOT, 'js', 'slimo.js'));

  // inject CSS in <head>
  if (!/<link\b[^>]*\bhref\s*=\s*["'][^"']*slimo\.css[^"']*["'][^>]*>/i.test(html)) {
    const headClose = html.search(/<\/head>/i);
    if (headClose >= 0) {
      html = html.slice(0, headClose) + `  <link rel="stylesheet" href="${cssHref}">\n` + html.slice(headClose);
    } else {
      html = `  <link rel="stylesheet" href="${cssHref}">\n` + html;
    }
  }

  // inject JS: prefer immediately after cloud.js; else at end of body
  const scriptTag = `  <script src="${jsSrc}" defer></script>\n`;
  if (RE_CLOUD.test(html)) {
    html = html.replace(RE_CLOUD, '$1\n' + scriptTag);
  } else {
    const bodyClose = html.search(/<\/body>/i);
    if (bodyClose >= 0) {
      html = html.slice(0, bodyClose) + scriptTag + html.slice(bodyClose);
    } else {
      html += '\n' + scriptTag;
    }
  }

  if (html !== before) {
    await writeFile(file, html, 'utf8');
    return true;
  }
  return false;
}

async function main() {
  const files = await walk(ROOT);
  let touched = 0;
  for (const f of files) {
    try {
      if (await patch(f)) { touched++; console.log('patched', relative(ROOT, f)); }
    } catch (e) {
      console.error('FAILED', relative(ROOT, f), e.message);
    }
  }
  console.log(`\nDone. Patched ${touched}/${files.length} html file(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
