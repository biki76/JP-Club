import { readFileSync, existsSync } from 'fs';

const checks = [
  { name: 'js/streak-prompt.js exists', test: () => existsSync('js/streak-prompt.js') },
  { name: 'js/cmd-palette.js exists', test: () => existsSync('js/cmd-palette.js') },
  { name: 'js/empty-states.js exists', test: () => existsSync('js/empty-states.js') },
  { name: 'docs/qa-checklist.md exists', test: () => existsSync('docs/qa-checklist.md') },
  { name: 'streak-prompt.js contains nihongo_signin_prompted', test: () => existsSync('js/streak-prompt.js') && readFileSync('js/streak-prompt.js', 'utf8').includes('nihongo_signin_prompted') },
  { name: 'cmd-palette.js contains aria-modal', test: () => existsSync('js/cmd-palette.js') && readFileSync('js/cmd-palette.js', 'utf8').includes('aria-modal') },
  { name: 'empty-states.js contains data-en and data-bn', test: () => {
    if (!existsSync('js/empty-states.js')) return false;
    const c = readFileSync('js/empty-states.js', 'utf8');
    return c.includes('data-en') && c.includes('data-bn');
  }}
];

let allPass = true;
for (const check of checks) {
  try {
    const pass = check.test();
    console.log(`${pass ? 'PASS' : 'FAIL'}: ${check.name}`);
    if (!pass) allPass = false;
  } catch (e) {
    console.log(`FAIL: ${check.name} (${e.message})`);
    allPass = false;
  }
}

console.log(allPass ? '\nAll QA feature checks passed.' : '\nSome checks failed. Review missing files or content.');
