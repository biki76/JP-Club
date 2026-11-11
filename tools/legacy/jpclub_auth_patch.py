import re, io
def rd(p): return open(p, encoding='utf-8').read()
def wr(p, s): open(p, 'w', encoding='utf-8').write(s)

# ---------- auth.html ----------
h = rd('auth.html')
h = h.replace('<html lang="en" data-en data-bn="0">', '<html lang="en">', 1)
h = re.sub(r'<title[^>]*>.*?</title>', '<title data-en="Sign in · JP-Club" data-bn="সাইন ইন · JP-Club">Sign in · JP-Club</title>', h, 1, flags=re.S)
h = re.sub(r'<!-- Pre-paint \(theme/lang\) -->\s*<script>.*?</script>', lambda m: '''<!-- Pre-paint (theme/lang) -->
<script>
(function(){
  var r = document.documentElement;
  var t = localStorage.getItem('nihongo_theme') || 'light';
  var l = localStorage.getItem('nihongo_lang') || 'en';
  if (t === 'dark') r.setAttribute('data-theme', 'dark');
  r.lang = l;
})();
</script>''', h, 1, flags=re.S)

SYMBOL = '''<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <symbol id="slimo" viewBox="0 0 120 124">
    <ellipse cx="60" cy="114" rx="40" ry="5" fill="#351a6b" opacity=".16"/>
    <path d="M18 98C18 98 26 64 44 44C50 38 54 32 60 32C66 32 70 38 76 44C94 64 102 98 102 98C102 105 94 107 60 107C26 107 18 105 18 98Z" fill="#a96cf5"/>
    <path d="M18 98C18 105 26 107 60 107C94 107 102 105 102 98C102 93 94 95 60 95C26 95 18 93 18 98Z" fill="#8a55c9"/>
    <path d="M60 32V20" stroke="#a96cf5" stroke-width="4" stroke-linecap="round"/>
    <circle cx="60" cy="14" r="7" fill="#c08cff"/>
    <ellipse cx="44" cy="60" rx="5" ry="3" transform="rotate(-35 44 60)" fill="#fff" opacity=".5"/>
    <circle cx="48" cy="76" r="5" fill="#351a6b"/><circle cx="72" cy="76" r="5" fill="#351a6b"/>
    <circle cx="46.5" cy="74.5" r="1.6" fill="#fff"/><circle cx="70.5" cy="74.5" r="1.6" fill="#fff"/>
    <ellipse cx="37" cy="86" rx="7" ry="4.5" fill="#ffa8dd"/><ellipse cx="83" cy="86" rx="7" ry="4.5" fill="#ffa8dd"/>
    <ellipse cx="60" cy="87" rx="3" ry="2.4" fill="#351a6b"/>
  </symbol>
</svg>
'''
h = h.replace('<body class="auth-body">\n', '<body class="auth-body">\n' + SYMBOL, 1)

BRAND = '''<aside class="auth-brand" aria-hidden="true">
    <div class="auth-brand-inner">
      <div class="auth-bubble" data-en="Hi! I'm Slimo 👋" data-bn="হ্যালো! আমি স্লিমো 👋">Hi! I'm Slimo 👋</div>
      <svg class="auth-slimo" viewBox="0 0 120 124"><use href="#slimo"/></svg>
      <h1 data-en="Learn Japanese, in বাংলা" data-bn="বাংলায় জাপানিজ শিখুন">Learn Japanese, in বাংলা</h1>
      <p data-en="Minna no Nihongo · Kanji · Mimikara · Shin Kanzen"
         data-bn="মিন্না নো নিহঙ্গো · কানজি · মিমিকারা · শিন কানজেন">Minna no Nihongo · Kanji · Mimikara · Shin Kanzen</p>
    </div>
  </aside>'''
h = re.sub(r'<aside class="auth-brand".*?</aside>', lambda m: BRAND, h, 1, flags=re.S)

HEAD = '''<div class="auth-card">
      <header class="auth-head">
        <a class="auth-home" href="home.html" aria-label="JP-Club">
          <span class="auth-mark" aria-hidden="true">日</span><span class="auth-name">JP-Club</span>
        </a>
        <div class="auth-tools">
          <button type="button" id="auth-lang" class="auth-tool" aria-label="Language">বাং</button>
          <button type="button" id="auth-theme" class="auth-tool" aria-label="Dark mode">◐</button>
        </div>
      </header>
      <div class="auth-hello">
        <svg class="auth-slimo-sm" viewBox="0 0 120 124" aria-hidden="true"><use href="#slimo"/></svg>
        <div>
          <p class="auth-hello-title" data-en="Welcome to JP-Club" data-bn="JP-Club-এ স্বাগতম">Welcome to JP-Club</p>
          <p class="auth-hello-sub" data-en="Save your progress and learn on any device." data-bn="আপনার অগ্রগতি সংরক্ষণ করুন, যেকোনো ডিভাইসে শিখুন।">Save your progress and learn on any device.</p>
        </div>
      </div>
'''
h = h.replace('<div class="auth-card">\n', HEAD, 1)

FOOT = '''<p class="auth-foot">
      <span data-en="By continuing you agree to our" data-bn="চালিয়ে গেলে আপনি সম্মত হচ্ছেন আমাদের">By continuing you agree to our</span>
      <a href="terms.html" data-en="Terms" data-bn="শর্তাবলী">Terms</a>
      <span data-en="and" data-bn="ও">and</span>
      <a href="privacy.html" data-en="Privacy Policy" data-bn="গোপনীয়তা নীতি">Privacy Policy</a>.
    </p>'''
h = re.sub(r'<p class="auth-foot".*?</p>', lambda m: FOOT, h, 1, flags=re.S)

LANGJS = '''<script>
(function(){
  var R = document.documentElement, D = document;
  function apply(l){
    R.lang = l;
    D.querySelectorAll('[data-en][data-bn]').forEach(function(el){
      if (el === R) return;
      var t = el.getAttribute('data-' + l); if (t !== null) el.textContent = t;
    });
    D.querySelectorAll('[data-en-placeholder]').forEach(function(el){
      el.setAttribute('placeholder', el.getAttribute('data-' + l + '-placeholder') || '');
    });
    D.querySelectorAll('[data-aria-label-en]').forEach(function(el){
      el.setAttribute('aria-label', el.getAttribute('data-aria-label-' + l) || '');
    });
    var b = D.getElementById('auth-lang'); if (b) b.textContent = l === 'bn' ? 'EN' : 'বাং';
    D.title = l === 'bn' ? 'সাইন ইন · JP-Club' : 'Sign in · JP-Club';
  }
  apply(localStorage.getItem('nihongo_lang') || 'en');
  D.getElementById('auth-lang').addEventListener('click', function(){
    var n = R.lang === 'bn' ? 'en' : 'bn';
    try { localStorage.setItem('nihongo_lang', n); } catch(e){}
    apply(n);
  });
  D.getElementById('auth-theme').addEventListener('click', function(){
    var dark = R.getAttribute('data-theme') !== 'dark';
    if (dark) R.setAttribute('data-theme', 'dark'); else R.removeAttribute('data-theme');
    try { localStorage.setItem('nihongo_theme', dark ? 'dark' : 'light'); } catch(e){}
  });
})();
</script>
'''
marker = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>'
if 'id="auth-lang"' in h and LANGJS not in h and marker in h:
    h = h.replace(marker, LANGJS + marker, 1)
wr('auth.html', h)

# ---------- css/auth.css ----------
wr('css/auth.css', r'''/* auth.css — JP-Club auth, token-driven (indigo brand + Slimo) */
.auth-body{--on-primary:#fff;margin:0;min-height:100vh;background:var(--bg);color:var(--ink);font-family:var(--font-en)}
html[lang="bn"] .auth-body{font-family:var(--font-bn)}
.auth-shell{display:flex;flex-direction:column;min-height:100vh}
@media(min-width:900px){.auth-shell{flex-direction:row}}

/* Brand column (desktop) */
.auth-brand{display:none;flex:1;align-items:center;justify-content:center;padding:var(--s-12);color:var(--on-primary);
  background:radial-gradient(circle at 20% 15%,var(--accent) -60%,transparent 55%),linear-gradient(145deg,var(--primary),var(--primary-hover))}
@media(min-width:900px){.auth-brand{display:flex}}
.auth-brand-inner{max-width:420px;text-align:center}
.auth-bubble{display:inline-block;background:var(--surface);color:var(--ink);padding:var(--s-2) var(--s-4);border-radius:var(--r-full);font-weight:600;box-shadow:var(--shadow-md);position:relative;margin-bottom:var(--s-4)}
.auth-bubble::after{content:"";position:absolute;left:50%;bottom:-6px;width:12px;height:12px;background:var(--surface);transform:translateX(-50%) rotate(45deg)}
.auth-slimo{display:block;width:180px;height:auto;margin:0 auto var(--s-6);animation:auth-float 3.4s ease-in-out infinite}
.auth-brand h1{font-size:var(--fs-3xl);margin:0 0 var(--s-3);font-weight:700;letter-spacing:-.02em}
.auth-brand p{margin:0;opacity:.92;font-size:var(--fs-md)}
@keyframes auth-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@media(prefers-reduced-motion:reduce){.auth-slimo{animation:none}}

/* Form column */
.auth-form-wrap{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:var(--s-4)}
.auth-card{width:100%;max-width:440px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--shadow-lg);padding:var(--s-6)}

.auth-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s-4)}
.auth-home{display:flex;align-items:center;gap:var(--s-2);text-decoration:none;color:var(--ink);font-weight:700;font-size:var(--fs-lg)}
.auth-mark{display:grid;place-items:center;width:2.25rem;height:2.25rem;border-radius:var(--r-md);background:var(--primary);color:var(--on-primary);font-family:var(--font-jp);font-weight:700}
.auth-tools{display:flex;gap:var(--s-2)}
.auth-tool{min-width:2.5rem;height:2.5rem;padding:0 var(--s-3);border:1px solid var(--border);border-radius:var(--r-full);background:var(--surface);color:var(--ink);font:inherit;font-size:var(--fs-sm);cursor:pointer}
.auth-tool:hover{border-color:var(--primary);color:var(--primary)}

.auth-hello{display:flex;align-items:center;gap:var(--s-3);padding:var(--s-3) var(--s-4);margin-bottom:var(--s-5);background:var(--primary-glow);border-radius:var(--r-md)}
.auth-slimo-sm{flex:none;width:56px;height:auto}
.auth-hello-title{margin:0;font-weight:700;font-size:var(--fs-lg)}
.auth-hello-sub{margin:0;color:var(--ink-muted);font-size:var(--fs-sm)}

.auth-tabs{display:flex;border-bottom:1px solid var(--border);margin-bottom:var(--s-5)}
.auth-tabs button{flex:1;padding:var(--s-3);background:none;border:0;border-bottom:3px solid transparent;margin-bottom:-1px;color:var(--ink-muted);font:inherit;font-weight:600;cursor:pointer}
.auth-tabs button:hover{color:var(--ink)}
.auth-tabs button[aria-selected="true"]{color:var(--primary);border-bottom-color:var(--primary)}

.auth-social{display:grid;gap:var(--s-3)}
.auth-social-btn{display:flex;align-items:center;justify-content:center;gap:var(--s-3);min-height:3rem;padding:0 var(--s-4);border:1px solid var(--border);border-radius:var(--r-md);background:var(--surface);color:var(--ink);font:inherit;font-weight:600;cursor:pointer;transition:border-color .15s,background .15s}
.auth-social-btn:hover{border-color:var(--primary);background:var(--primary-glow)}
.auth-social-btn svg{width:20px;height:20px}
.auth-facebook svg{color:#1877f2}
.auth-divider{display:flex;align-items:center;gap:var(--s-3);margin:var(--s-5) 0;color:var(--ink-subtle);font-size:var(--fs-sm)}
.auth-divider::before,.auth-divider::after{content:"";flex:1;height:1px;background:var(--border)}
/* social only on Sign in and signup step 1 */
.auth-card:has(#form-signup:not(.auth-form--hidden) .auth-step.is-active:not([data-step="1"])) .auth-social,
.auth-card:has(#form-signup:not(.auth-form--hidden) .auth-step.is-active:not([data-step="1"])) .auth-divider{display:none}

.auth-form{display:grid;gap:var(--s-4)}
.auth-form--hidden,.auth-step-pane--hidden,.auth-step-nav--hidden{display:none!important}
.auth-field{display:grid;gap:var(--s-1)}
.auth-field>span{font-size:var(--fs-sm);font-weight:600;color:var(--ink)}
.auth-field input,.auth-field select,.auth-field textarea{width:100%;box-sizing:border-box;padding:var(--s-3) var(--s-4);border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg);color:var(--ink);font:inherit;font-size:var(--fs-md)}
.auth-field input:focus,.auth-field select:focus,.auth-field textarea:focus{outline:2px solid var(--focus);outline-offset:2px;border-color:var(--primary)}
.auth-field small{color:var(--ink-subtle);font-size:var(--fs-xs)}
.auth-row{display:flex;flex-wrap:wrap;gap:var(--s-3);align-items:center;justify-content:space-between}
.auth-check{display:flex;align-items:center;gap:var(--s-2);font-size:var(--fs-sm);color:var(--ink-muted)}
.auth-link{background:none;border:0;padding:0;color:var(--primary);font:inherit;font-size:var(--fs-sm);cursor:pointer;text-decoration:underline}
.auth-link:hover{color:var(--primary-hover)}

.auth-submit,.auth-next{min-height:3rem;padding:0 var(--s-5);border:0;border-radius:var(--r-md);background:var(--primary);color:var(--on-primary);font:inherit;font-weight:700;cursor:pointer;box-shadow:0 6px 16px var(--primary-glow);transition:background .15s}
.auth-submit:hover,.auth-next:hover{background:var(--primary-hover)}
.auth-submit:disabled{opacity:.6;cursor:not-allowed}
.auth-submit.loading{position:relative;color:transparent}
.auth-submit.loading::after{content:"";position:absolute;inset:0;margin:auto;width:1.25rem;height:1.25rem;border:3px solid var(--on-primary);border-right-color:transparent;border-radius:50%;animation:auth-spin .7s linear infinite}
@keyframes auth-spin{to{transform:rotate(360deg)}}
.auth-back{min-height:3rem;padding:0 var(--s-5);border:1px solid var(--border);border-radius:var(--r-md);background:var(--surface);color:var(--ink);font:inherit;cursor:pointer}
.auth-back:hover{border-color:var(--primary)}
.auth-step-nav{display:flex;gap:var(--s-3)}
.auth-step-nav>*{flex:1}

.auth-msg{margin:0;min-height:1.25rem;font-size:var(--fs-sm);color:var(--ink-muted)}
.auth-msg[data-kind="error"]{color:var(--danger)}
.auth-msg[data-kind="success"]{color:var(--success)}
.auth-msg[data-kind="info"]{color:var(--primary)}

.auth-steps{display:flex;justify-content:space-between;list-style:none;margin:0 0 var(--s-2);padding:0}
.auth-step{flex:1;display:grid;justify-items:center;gap:var(--s-1);color:var(--ink-subtle)}
.auth-step span{display:grid;place-items:center;width:2rem;height:2rem;border-radius:50%;background:var(--border);color:var(--ink-muted);font-weight:700;font-size:var(--fs-sm)}
.auth-step.is-active span{background:var(--primary);color:var(--on-primary)}
.auth-step.is-active small{color:var(--primary);font-weight:600}
.auth-step small{font-size:var(--fs-xs)}
.auth-step-pane{border:0;margin:0;padding:0;display:grid;gap:var(--s-4)}

.auth-foot{max-width:440px;margin:var(--s-4) 0 0;text-align:center;color:var(--ink-subtle);font-size:var(--fs-xs)}
.auth-foot a{color:var(--primary)}
@media(max-width:899px){.auth-form-wrap{justify-content:flex-start;padding-top:var(--s-6)}.auth-card{padding:var(--s-5)}}
''')

# ---------- js/phrase-of-day.js ----------
wr('js/phrase-of-day.js', r'''/* phrase-of-day.js — rotates "Today's phrase" daily (local date), 30 phrases */
(function () {
  var P = [
    {s:[['毎日','まいにち'],['、'],['少','すこ'],['しずつ。']],r:'mainichi, sukoshizutsu.',en:'Every day, a little at a time.',bn:'প্রতিদিন, একটু একটু করে।'},
    {s:[['ありがとうございます。']],r:'arigatō gozaimasu.',en:'Thank you very much.',bn:'অনেক ধন্যবাদ।'},
    {s:[['おはようございます。']],r:'ohayō gozaimasu.',en:'Good morning.',bn:'শুভ সকাল।'},
    {s:[['こんにちは。']],r:'konnichiwa.',en:'Hello / Good afternoon.',bn:'হ্যালো / শুভ দিন।'},
    {s:[['こんばんは。']],r:'konbanwa.',en:'Good evening.',bn:'শুভ সন্ধ্যা।'},
    {s:[['おやすみなさい。']],r:'oyasumi nasai.',en:'Good night.',bn:'শুভ রাত্রি।'},
    {s:[['はじめまして。']],r:'hajimemashite.',en:'Nice to meet you (first meeting).',bn:'প্রথম পরিচয়ে আপনাকে স্বাগতম।'},
    {s:[['よろしくお願','ねが'],['いします。']],r:'yoroshiku onegaishimasu.',en:'Please treat me kindly.',bn:'অনুগ্রহ করে আমাকে সহযোগিতা করবেন।'},
    {s:[['すみません。']],r:'sumimasen.',en:'Excuse me / Sorry.',bn:'মাফ করবেন / দুঃখিত।'},
    {s:[['ごめんなさい。']],r:'gomen nasai.',en:"I'm sorry.",bn:'আমি দুঃখিত।'},
    {s:[['いただきます。']],r:'itadakimasu.',en:'Let\u2019s eat (said before a meal).',bn:'খাওয়া শুরু করছি (খাবারের আগে বলা হয়)।'},
    {s:[['ごちそうさまでした。']],r:'gochisōsama deshita.',en:'Thank you for the meal.',bn:'খাবারের জন্য ধন্যবাদ।'},
    {s:[['お元気','げんき'],['ですか。']],r:'ogenki desu ka.',en:'How are you?',bn:'আপনি কেমন আছেন?'},
    {s:[['元気','げんき'],['です。']],r:'genki desu.',en:"I'm fine.",bn:'আমি ভালো আছি।'},
    {s:[['わかりません。']],r:'wakarimasen.',en:"I don't understand.",bn:'আমি বুঝতে পারছি না।'},
    {s:[['もう'],['一度','いちど'],['お願','ねが'],['いします。']],r:'mō ichido onegaishimasu.',en:'One more time, please.',bn:'দয়া করে আরেকবার বলুন।'},
    {s:[['ゆっくり'],['話','はな'],['してください。']],r:'yukkuri hanashite kudasai.',en:'Please speak slowly.',bn:'দয়া করে ধীরে বলুন।'},
    {s:[['日本語','にほんご'],['を'],['勉強','べんきょう'],['しています。']],r:'nihongo o benkyō shite imasu.',en:"I'm studying Japanese.",bn:'আমি জাপানি ভাষা শিখছি।'},
    {s:[['これはいくらですか。']],r:'kore wa ikura desu ka.',en:'How much is this?',bn:'এটার দাম কত?'},
    {s:[['トイレはどこですか。']],r:'toire wa doko desu ka.',en:'Where is the restroom?',bn:'টয়লেট কোথায়?'},
    {s:[['水','みず'],['をください。']],r:'mizu o kudasai.',en:'Water, please.',bn:'দয়া করে একটু পানি দিন।'},
    {s:[['がんばってください。']],r:'ganbatte kudasai.',en:'Do your best!',bn:'চেষ্টা চালিয়ে যান, শুভকামনা!'},
    {s:[['七転','ななころ'],['び'],['八起','やお'],['き。']],r:'nanakorobi yaoki.',en:'Fall seven times, stand up eight.',bn:'সাতবার পড়লে আটবার উঠো।'},
    {s:[['継続','けいぞく'],['は'],['力','ちから'],['なり。']],r:'keizoku wa chikara nari.',en:'Persistence is power.',bn:'ধারাবাহিকতাই শক্তি।'},
    {s:[['失礼','しつれい'],['します。']],r:'shitsurei shimasu.',en:'Excuse me (entering/leaving).',bn:'আমাকে মাফ করবেন (প্রবেশ/প্রস্থানের সময়)।'},
    {s:[['お疲','つか'],['れ様','さま'],['でした。']],r:'otsukaresama deshita.',en:'Thank you for your hard work.',bn:'আপনার পরিশ্রমের জন্য ধন্যবাদ।'},
    {s:[['また'],['明日','あした'],['。']],r:'mata ashita.',en:'See you tomorrow.',bn:'কাল দেখা হবে।'},
    {s:[['楽','たの'],['しかったです。']],r:'tanoshikatta desu.',en:'It was fun.',bn:'খুব মজা হয়েছিল।'},
    {s:[['大丈夫','だいじょうぶ'],['です。']],r:'daijōbu desu.',en:"It's okay.",bn:'ঠিক আছে।'},
    {s:[['好','す'],['きです。']],r:'suki desu.',en:'I like it.',bn:'আমার এটা পছন্দ।'}
  ];
  var offset = 0;
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
  function today(){
    var d = new Date();
    return Math.floor((Date.now() - d.getTimezoneOffset() * 60000) / 864e5);
  }
  function render(){
    var c = document.querySelector('.phrase-card'); if (!c) return;
    var p = P[(((today() + offset) % P.length) + P.length) % P.length];
    var l = document.documentElement.lang === 'bn' ? 'bn' : 'en';
    var jp = c.querySelector('.phrase-card__jp');
    var ro = c.querySelector('.phrase-card__romaji');
    var en = c.querySelector('.phrase-card__en');
    if (jp) jp.innerHTML = p.s.map(function(x){
      return x[1] ? '<ruby>' + esc(x[0]) + '<rt>' + esc(x[1]) + '</rt></ruby>' : esc(x[0]);
    }).join('');
    if (ro) ro.textContent = p.r;
    if (en) en.innerHTML = '<span data-en="' + esc(p.en) + '" data-bn="' + esc(p.bn) + '">' + esc(p[l]) + '</span>';
  }
  function addButton(){
    var c = document.querySelector('.phrase-card'); if (!c || c.querySelector('.phrase-next')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'phrase-next';
    b.innerHTML = '<span data-en="Next phrase \u21bb" data-bn="পরবর্তী বাক্যাংশ \u21bb">Next phrase \u21bb</span>';
    b.style.cssText = 'margin-top:var(--s-3);padding:var(--s-2) var(--s-4);border:1px solid var(--border);border-radius:var(--r-full);background:var(--surface);color:var(--primary);font:inherit;font-size:var(--fs-sm);cursor:pointer';
    b.addEventListener('click', function(){ offset++; render(); });
    c.appendChild(b);
    if (document.documentElement.lang === 'bn') b.firstChild.textContent = b.firstChild.getAttribute('data-bn');
  }
  function init(){ render(); addButton(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
''')

# ---------- home.html ----------
try:
    hm = rd('home.html')
    tag = '<script src="js/phrase-of-day.js" defer></script>'
    anchor = '<script src="js/slimo.js?v=2" defer></script>'
    if tag not in hm and anchor in hm:
        wr('home.html', hm.replace(anchor, tag + '\n  ' + anchor, 1))
except FileNotFoundError:
    pass
print('done')
