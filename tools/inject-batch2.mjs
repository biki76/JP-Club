import fs from 'fs';
const files = fs.readdirSync('.').filter(f => f.endsWith('.html') && !['home.html', 'auth-callback.html'].includes(f));
const cssLinks = ['<link rel="stylesheet" href="css/toasts.css">', '<link rel="stylesheet" href="css/streak-prompt.css">'];
const jsScripts = ['<script src="js/toasts.js" defer></script>', '<script src="js/streak-prompt.js" defer></script>', '<script src="js/tabs-memory.js" defer></script>'];
for (const f of files) {
  let html = fs.readFileSync(f, 'utf8');
  let changed = false;
  for (const link of cssLinks) {
    if (!html.includes(link)) { html = html.replace('</head>', link + '\n</head>'); changed = true; }
  }
  for (const script of jsScripts) {
    if (!html.includes(script)) { html = html.replace('</body>', script + '\n</body>'); changed = true; }
  }
  if (changed) fs.writeFileSync(f, html);
}
