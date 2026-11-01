import fs from 'fs';
let pairs = [];
if (fs.existsSync('docs')) {
  for (const f of fs.readdirSync('docs').filter(x => x.endsWith('.md'))) {
    const txt = fs.readFileSync('docs/' + f, 'utf8');
    const idx = txt.search(/microcopy/i);
    if (idx === -1) continue;
    const section = txt.slice(idx);
    for (const line of section.split('\n')) {
      const m = line.match(/^\s*\|(.+)\|\s*$/);
      if (!m) continue;
      const cells = m[1].split('|').map(s => s.trim());
      if (cells.length >= 3 && cells[0] && !/old|string|text|en\b/i.test(cells[0])) {
        pairs.push({ old: cells[0], en: cells[1], bn: cells[2] });
      }
    }
    if (pairs.length) break;
  }
}
if (!pairs.length) {
  pairs = [
    { old: 'Submit', en: 'Check answer', bn: 'উত্তর যাচাই করুন' },
    { old: 'Correct!', en: 'Nice! Correct.', bn: 'দারুণ! সঠিক।' },
    { old: 'Incorrect', en: 'Not quite — try again.', bn: 'ঠিক নয় — আবার চেষ্টা করুন।' },
    { old: 'Loading...', en: 'Loading…', bn: 'লোড হচ্ছে…' },
    { old: 'No results', en: 'No matches found', bn: 'কিছু মেলেনি' },
    { old: 'Click here', en: 'Tap here', bn: 'এখানে ট্যাপ করুন' }
  ];
}
fs.mkdirSync('content', { recursive: true });
fs.writeFileSync('content/microcopy.json', JSON.stringify(pairs, null, 1));
console.log('microcopy pairs:', pairs.length);
