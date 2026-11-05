import fs from 'fs';
let h = fs.readFileSync('home.html', 'utf8');
const main = `<main class="shell-main" id="main">
      <section class="tutor-head">
        <h1><span data-en="AI Tutor" data-bn="এআই টিউটর">AI Tutor</span></h1>
        <p><span data-en="Practice Japanese by chatting or speaking. Pick your level and start." data-bn="চ্যাট বা কথা বলে জাপানি অনুশীলন করুন। আপনার লেভেল বেছে শুরু করুন।">Practice Japanese by chatting or speaking. Pick your level and start.</span></p>
      </section>
      <div id="tutor-host" class="tutor-host"></div>
    </main>`;
h = h.replace(/<main class="shell-main"[^>]*>[\s\S]*<\/main>/, () => main);
h = h.replace(/^.*css\/home\.css.*\n/m, '').replace(/^.*js\/home\.js.*\n/m, '');
h = h.replace(/<title>[\s\S]*?<\/title>/, '<title>AI Tutor — JP-Club</title>');
h = h.split('\n').map(l => /canonical|og:url/.test(l) ? l.replace('home.html', 'tutor.html') : l).join('\n');
h = h.replace('<link rel="stylesheet" href="css/ai-tutor.css">',
  '<link rel="stylesheet" href="css/ai-tutor.css">\n  <link rel="stylesheet" href="css/tutor-page.css">');
h = h.replace('<script src="js/ai-tutor/init.js" defer></script>',
  '<script src="js/ai-tutor/init.js" defer></script>\n  <script src="js/tutor-page.js" defer></script>');
fs.writeFileSync('tutor.html', h);
console.log('tutor.html created');
