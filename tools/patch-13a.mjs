import fs from 'node:fs';

const BASE = 'https://biki76.github.io/JP-Club/';
const OG_IMAGE = BASE + 'og.svg';
const pages = ['home','lesson','flashcards','quiz','kanji','search','progress','placement'];

function setAttr(html, tagRe, attr, value) {
  const attrRe = new RegExp('(\\b' + attr + '=)(["\'])[^"\']*\\2', 'i');
  return html.replace(tagRe, tag => tag.replace(attrRe, (m, a, q) => a + q + value + q));
}

const MARK = 'data-noscript-fallback';
const noscript = `
<noscript ${MARK}>
  <nav style="padding:16px;font-family:sans-serif">
    <p>JavaScript is required for lessons. / লেসন চালাতে JavaScript প্রয়োজন।</p>
    <ul>
      <li><a href="lesson.html?lesson=minna-001">Lesson 1 / লেসন ১</a></li>
      <li><a href="flashcards.html">Flashcards / ফ্ল্যাশকার্ড</a></li>
      <li><a href="quiz.html">Quiz / কুইজ</a></li>
      <li><a href="kanji.html">Kanji / কাঞ্জি</a></li>
    </ul>
  </nav>
</noscript>`;

for (const p of pages) {
  const file = p + '.html';
  if (!fs.existsSync(file)) { console.warn('SKIP (not found):', file); continue; }
  const before = fs.readFileSync(file, 'utf8');
  let html = before;
  const url = BASE + file;

  html = setAttr(html, /<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, 'href', url);
  html = setAttr(html, /<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/gi, 'content', url);
  html = setAttr(html, /<meta\b[^>]*\bproperty=["']og:image["'][^>]*>/gi, 'content', OG_IMAGE);
  html = setAttr(html, /<meta\b[^>]*\bname=["']twitter:image["'][^>]*>/gi, 'content', OG_IMAGE);

  html = html.replace(
    /<meta\b[^>]*(?:name|property)=["'](?:description|og:description|twitter:description)["'][^>]*>/gi,
    tag => tag.replace(/N5\s*[–—-]\s*N3/g, 'N5/N4')
  );

  if (p === 'home' && !html.includes(MARK)) {
    html = html.replace(/<body\b[^>]*>/i, m => m + '\n' + noscript);
  }

  if (html !== before) { fs.writeFileSync(file, html); console.log('PATCHED  ', file); }
  else console.log('no change', file);
}
