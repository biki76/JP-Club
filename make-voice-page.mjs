import fs from 'fs';
let h = fs.readFileSync('home.html', 'utf8');
const main = `<main class="shell-main" id="main">
      <section class="tv">
        <h1><span data-en="Speaking Partner" data-bn="স্পিকিং পার্টনার">Speaking Partner</span></h1>
        <p class="tv-sub"><span data-en="Talk in Japanese. I match your level and pace, and gently correct you." data-bn="জাপানিতে কথা বলুন। আমি আপনার লেভেল ও গতির সাথে মিলিয়ে চলব এবং ভুল শুধরে দেব।">Talk in Japanese. I match your level and pace, and gently correct you.</span></p>
        <div class="tv-controls">
          <label><span data-en="Level" data-bn="লেভেল">Level</span>
            <select id="tv-level"><option>N5</option><option>N4</option><option>N3</option><option>N2</option><option>N1</option></select></label>
          <label><span data-en="Speed" data-bn="গতি">Speed</span>
            <input type="range" id="tv-rate" min="0.6" max="1.1" step="0.05" value="0.85"></label>
        </div>
        <div class="tv-stage">
          <button id="tv-orb" class="tv-orb" data-state="idle" aria-label="Start or stop talking">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>
          </button>
          <p id="tv-status" class="tv-status" aria-live="polite"></p>
        </div>
        <div id="tv-log" class="tv-log"></div>
        <div class="tv-row">
          <input id="tv-input" class="tv-input" lang="ja" placeholder="日本語で入力…" aria-label="Type in Japanese">
          <button id="tv-send" class="tv-btn" aria-label="Send">→</button>
        </div>
        <div class="tv-row">
          <button id="tv-repeat" class="tv-btn"><span data-en="Repeat" data-bn="আবার শুনুন">Repeat</span></button>
          <button id="tv-reset" class="tv-btn"><span data-en="New conversation" data-bn="নতুন কথোপকথন">New conversation</span></button>
        </div>
      </section>
    </main>`;
h = h.replace(/<main class="shell-main"[^>]*>[\s\S]*<\/main>/, () => main);
h = h.split('\n').filter(l => !/ai-tutor|css\/home\.css|js\/home\.js|tutor-page|tutor-voice/.test(l)).join('\n');
h = h.replace(/<title>[\s\S]*?<\/title>/, '<title>Speaking Partner — JP-Club</title>');
h = h.split('\n').map(l => /canonical|og:url/.test(l) ? l.replace('home.html', 'tutor.html') : l).join('\n');
h = h.replace('</head>', '  <link rel="stylesheet" href="css/tutor-voice.css">\n</head>');
h = h.replace('</body>', '  <script src="js/tutor-voice.js" defer></script>\n</body>');
fs.writeFileSync('tutor.html', h);
console.log('tutor.html rebuilt');
