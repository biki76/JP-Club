import fs from 'fs';
let h = fs.readFileSync('progress.html', 'utf8');
if (h.includes('progress-speaking')) { console.log('already patched'); process.exit(0); }
h = h.replace('</head>', () => '  <link rel="stylesheet" href="css/progress-speaking.css">\n</head>');
h = h.replace('</body>', () => '  <script src="js/progress-speaking.js" defer></script>\n</body>');
fs.writeFileSync('progress.html', h);
console.log('progress.html patched');
