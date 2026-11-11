#!/usr/bin/env node
/* tests/run-ts.mjs — runs the TypeScript tests with plain Node (no Deno, no build step).
 * The repo's package.json says "type": "commonjs", which would make Node reject the ESM .ts files,
 * so the sources are copied to a temp folder that has its own {"type":"module"} package.json.
 * Needs Node ≥ 22.18 (or 22.6+ — the runner passes --experimental-strip-types itself). */
import { cpSync, mkdtempSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'jpclub-ts-'));
try {
  cpSync(join(ROOT, 'supabase/functions/_shared'), join(tmp, 'supabase/functions/_shared'), { recursive: true });
  cpSync(join(ROOT, 'supabase/functions/ai-tutor/lib'), join(tmp, 'supabase/functions/ai-tutor/lib'), { recursive: true });
  cpSync(join(ROOT, 'tests/ai-tutor'), join(tmp, 'tests/ai-tutor'), { recursive: true });
  writeFileSync(join(tmp, 'package.json'), '{"type":"module"}\n');
  const files = readdirSync(join(tmp, 'tests/ai-tutor')).filter((f) => f.endsWith('.test.ts')).map((f) => join('tests/ai-tutor', f));
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--test', ...files], { cwd: tmp, stdio: 'inherit' });
  process.exitCode = r.status ?? 1;
} finally { rmSync(tmp, { recursive: true, force: true }); }
