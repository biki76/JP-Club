import fs from 'fs';
const read = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
const v2src = read('css/theme-v2.css');
const baseSrc = read('css/tokens.css') + read('css/tokens-extra.css') + read('css/design-system.css');
const tok = read('css/tokens.css');
if (tok.includes('qwen: v2-aliases')) {
  console.log('v2 aliases already present');
} else {
  const baseNames = new Set([...baseSrc.matchAll(/--[a-z0-9-]+(?=\s*:)/g)].map(m => m[0]));
  const names = [...new Set([...v2src.matchAll(/--v2-([a-z0-9-]+)(?=\s*:)/g)].map(m => m[1]))];
  const aliases = names.filter(n => baseNames.has('--' + n));
  if (aliases.length) {
    const block = '\n/* qwen: v2-aliases — legacy --v2-* names mapped to base tokens */\n:root {\n'
      + aliases.map(n => '  --v2-' + n + ': var(--' + n + ');').join('\n')
      + '\n}\n';
    fs.appendFileSync('css/tokens.css', block);
    console.log('appended ' + aliases.length + ' v2 aliases');
  } else {
    console.log('no mappable --v2-* tokens found');
  }
}
