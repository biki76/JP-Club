import fs from 'fs';
const pages = ['home.html','lesson.html','lessons.html','flashcards.html','quiz.html',
  'kanji.html','search.html','progress.html','placement.html','offline.html'];
for (const f of pages) {
  if (!fs.existsSync(f)) continue;
  let h = fs.readFileSync(f, 'utf8');
  const before = h;
  if (!h.includes('css/phase13.css'))
    h = h.replace('</head>', '  <link rel="stylesheet" href="css/phase13.css">\n</head>');
  if (!h.includes('viewport-fit=cover'))
    h = h.replace(/<meta name="viewport" content="([^"]*)">/, (m, c) => `<meta name="viewport" content="${c}, viewport-fit=cover">`);
  if (!h.includes('js/phase13-shell.js'))
    h = h.replace(/<script src="js\/shell\.js" defer><\/script>/, '$&\n  <script src="js/phase13-shell.js" defer></script>');
  if (h !== before) { fs.writeFileSync(f, h); console.log('✓ patched', f); }
  else console.log('· already patched', f);
}
