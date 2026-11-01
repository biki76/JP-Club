import fs from 'fs';
const files = fs.readdirSync('.').filter(f => f.endsWith('.html') && !['home.html', 'auth-callback.html'].includes(f));
const cssLink = '<link rel="stylesheet" href="css/perf.css">';
const jsScript = '<script src="js/a11y-hooks.js" defer></script>';
for (const f of files) {
  let html = fs.readFileSync(f, 'utf8');
  let changed = false;
  if (!html.includes(cssLink)) { html = html.replace('</head>', cssLink + '\n</head>'); changed = true; }
  if (!html.includes(jsScript)) { html = html.replace('</body>', jsScript + '\n</body>'); changed = true; }
  if (changed) fs.writeFileSync(f, html);
}
