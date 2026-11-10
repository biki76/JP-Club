/* phrase-of-day.js — rotates "Today's phrase" daily (local date), 30 phrases */
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
