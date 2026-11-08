#!/usr/bin/env python3
# Run from the JP-Club repo root:  python3 honsatsu-ui.py
import json, glob, os, re, sys

JS_RENDER = r'''    function renderHonsatsu(h) {
      if (!h || !Array.isArray(h.tracks) || !h.tracks.length) return '';
      const groups = { intro: [], lesson: [], review: [] };
      h.tracks.slice().sort((a, b) => (a.trackNo || 0) - (b.trackNo || 0)).forEach(t => {
        (groups[t.type === 'intro' ? 'intro' : t.type === 'review' ? 'review' : 'lesson']).push(t);
      });
      const L = h.lesson;
      const heads = {
        intro: `<p class="hs-head-jp" lang="ja">はじめに</p><h3 class="hs-head">${bilingual('Introduction: Pronunciation & Basics', 'ভূমিকা: উচ্চারণ ও মৌলিক বিষয়')}</h3>`,
        lesson: L ? `<p class="hs-head-jp" lang="ja">第${esc(L.no)}課　${esc(L.jp)}</p><h3 class="hs-head">${bilingual('Lesson ' + L.no + ': ' + L.en, 'পাঠ ' + L.no + ': ' + L.en)}</h3>` : `<h3 class="hs-head">${bilingual('Lesson Tracks', 'পাঠের ট্র্যাক')}</h3>`,
        review: `<p class="hs-head-jp" lang="ja">総復習</p><h3 class="hs-head">${bilingual('General Review', 'সাধারণ পুনরালোচনা')}</h3>`
      };
      const card = t => {
        const ti = t.title || {};
        const no = t.trackNo ? String(t.trackNo).padStart(2, '0') : '';
        return `<article class="hs-track">
          ${t.image ? `<img class="hs-thumb" src="${esc(t.image)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
          <div class="hs-body">
            <div class="hs-top">${no ? `<span class="hs-no">${no}</span>` : ''}<span class="badge badge--outline">${formatTrackType(t.type)}</span></div>
            ${t.jp ? `<p class="hs-jp" lang="ja">${esc(t.jp)}</p>` : ''}
            <p class="hs-en">${bilingual(ti.en, ti.bn || ti.en)}</p>
            ${t.desc && t.desc.en ? `<p class="hs-desc">${bilingual(t.desc.en, t.desc.bn || t.desc.en)}</p>` : ''}
          </div>
          <button type="button" class="btn btn--primary textbook-audio-play-btn hs-play" onclick="window.playLessonAudio('${esc(t.audioUrl)}')" aria-label="Play ${esc(ti.en)}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
          </button>
        </article>`;
      };
      const sec = key => groups[key].length
        ? `<section class="hs-section">${heads[key]}<div class="lv-list">${groups[key].map(card).join('')}</div></section>` : '';
      return `<div class="textbook-audio-section"><h2 class="lv-grammar-pattern hs-title">${bilingual('Textbook Audio', 'পাঠ্যপুস্তক অডিও')}</h2>${sec('intro')}${sec('lesson')}${sec('review')}</div>`;
    }

'''

CSS = r'''<style id="honsatsu-ui-css">
    .hs-title { margin-bottom: var(--s-3); font-size: var(--fs-lg); }
    .hs-section { margin-bottom: var(--s-5); }
    .hs-head-jp { font-family: var(--font-jp); font-size: var(--fs-sm); color: var(--ink-muted); margin: 0; }
    .hs-head { font-size: var(--fs-md); font-weight: 700; color: var(--ink); margin: 0 0 var(--s-3); }
    .hs-track { display: flex; align-items: center; gap: var(--s-3); padding: var(--s-3); background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); }
    .hs-thumb { width: 72px; height: 72px; object-fit: cover; border-radius: var(--r-sm); flex-shrink: 0; background: var(--bg); }
    .hs-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--s-1); }
    .hs-top { display: flex; align-items: center; gap: var(--s-2); }
    .hs-no { font-size: var(--fs-xs); font-weight: 700; color: var(--primary); font-variant-numeric: tabular-nums; }
    .hs-jp { font-family: var(--font-jp); font-size: var(--fs-md); font-weight: 600; color: var(--ink); margin: 0; }
    .hs-en { font-size: var(--fs-sm); font-weight: 600; color: var(--ink); margin: 0; }
    .hs-desc { font-size: var(--fs-sm); color: var(--ink-muted); margin: 0; }
    .hs-play { align-self: center; }
  </style>
'''

ATTACH = r'''import fs from 'node:fs';
import path from 'node:path';

const srcDir = process.argv[2];
const outDir = path.join('images', 'honsatsu');
fs.mkdirSync(outDir, { recursive: true });
const IMG = /\.(png|jpe?g|webp)$/i;

if (srcDir) {
  if (!fs.existsSync(srcDir)) { console.error('Folder not found: ' + srcDir); process.exit(1); }
  let copied = 0;
  for (const f of fs.readdirSync(srcDir)) {
    if (!IMG.test(f)) continue;
    const m = f.replace(IMG, '').match(/(\d{1,3})(?!.*\d)/);
    const n = m ? parseInt(m[1], 10) : 0;
    if (n < 1 || n > 87) { console.warn('skip (no track 1-87): ' + f); continue; }
    const ext = path.extname(f).toLowerCase().replace('.jpeg', '.jpg');
    for (const old of fs.readdirSync(outDir)) {
      if (old.startsWith(String(n).padStart(2, '0') + '.')) fs.unlinkSync(path.join(outDir, old));
    }
    fs.copyFileSync(path.join(srcDir, f), path.join(outDir, String(n).padStart(2, '0') + ext));
    copied++;
  }
  console.log('Copied ' + copied + ' image(s) to ' + outDir);
}

const have = {};
for (const f of fs.readdirSync(outDir)) {
  const m = f.match(/^(\d{2})\.(png|jpg|webp)$/);
  if (m) have[parseInt(m[1], 10)] = 'images/honsatsu/' + f;
}
let linked = 0;
const root = path.join('data', 'lessons');
for (const d of fs.readdirSync(root)) {
  const p = path.join(root, d, 'honsatsu-audio.json');
  if (!fs.existsSync(p)) continue;
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  let changed = false;
  for (const t of doc.tracks) {
    const img = have[t.trackNo];
    if (img && t.image !== img) { t.image = img; changed = true; linked++; }
  }
  if (changed) fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
}
console.log('Linked ' + linked + ' track(s). Images on disk: ' + Object.keys(have).length + ' of 87');
'''

CAT = {'tracks': {'1': {'jp': '日本語の発音 — 1. かなと拍', 'en': 'Japanese Pronunciation — 1. Kana & Mora', 'desc': 'Introduction to the basic sound units and writing systems.', 'lesson': None}, '2': {'jp': '日本語の発音 — 2. 長音', 'en': 'Japanese Pronunciation — 2. Long Vowels', 'desc': 'Drills covering extended vowel sounds.', 'lesson': None}, '3': {'jp': '日本語の発音 — 3. 撥音', 'en': 'Japanese Pronunciation — 3. The "n" Sound', 'desc': 'Rules and sound changes for the syllable-final nasal consonant.', 'lesson': None}, '4': {'jp': '日本語の発音 — 4. 促音', 'en': 'Japanese Pronunciation — 4. Double Consonants', 'desc': 'Practice with glottal stops / small double-consonant sounds.', 'lesson': None}, '5': {'jp': '日本語の発音 — 5. 拗音', 'en': 'Japanese Pronunciation — 5. Contracted Sounds', 'desc': 'Practice with y-glide sounds (e.g., kya, kyu, kyo).', 'lesson': None}, '6': {'jp': '日本語の発音 — 6. アクセント', 'en': 'Japanese Pronunciation — 6. Pitch Accent', 'desc': 'Understanding Japanese high-low word emphasis.', 'lesson': None}, '7': {'jp': '日本語の発音 — 7. イントネーション', 'en': 'Japanese Pronunciation — 7. Intonation', 'desc': 'Sentence melody variations for questions and statements.', 'lesson': None}, '8': {'jp': '教室の指示の言葉', 'en': 'Classroom Commands & Instructions', 'desc': 'Essential phrases used by teachers (e.g., "Look", "Listen", "Write").', 'lesson': None}, '9': {'jp': '毎日のあいさつと会話表現', 'en': 'Everyday Greetings & Conversational Expressions', 'desc': 'Standard greetings ("Good morning", "Goodbye") and basic social manners.', 'lesson': None}, '10': {'jp': '数字', 'en': 'Numerals / Counting Numbers', 'desc': 'Basic Japanese number counters from 0 to 10,000+.', 'lesson': None}, '11': {'jp': '第1課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Basic identity grammar using N1 は N2 です / じゃありません.', 'lesson': 1}, '12': {'jp': '第1課 — 練習C', 'en': 'Practice C', 'desc': 'Interactive drills practicing self-introductions.', 'lesson': 1}, '13': {'jp': '第1課 — 会話：初めまして', 'en': 'Conversation', 'desc': 'Mr. Miller introduces himself to the company team.', 'lesson': 1}, '14': {'jp': '第2課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Demonstrative pronouns (これ/それ/あれ) and possessive particle (の).', 'lesson': 2}, '15': {'jp': '第2課 — 練習C', 'en': 'Practice C', 'desc': 'Interactive practice identifying object ownership.', 'lesson': 2}, '16': {'jp': '第2課 — 会話：ほんの気持ちです', 'en': 'Conversation', 'desc': 'Mr. Miller exchanges neighborhood moving greetings and small tokens.', 'lesson': 2}, '17': {'jp': '第3課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Place demonstratives (ここ/そこ/あそこ) and tracking prices (いくら).', 'lesson': 3}, '18': {'jp': '第3課 — 練習C', 'en': 'Practice C', 'desc': 'Roleplay drills asking for building levels and department store item locations.', 'lesson': 3}, '19': {'jp': '第3課 — 会話：これをください', 'en': 'Conversation', 'desc': 'Purchasing an item at a wine or clothing counter.', 'lesson': 3}, '20': {'jp': '第4課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Telling specific hours/minutes, days of the week, and past/present verb conjugations.', 'lesson': 4}, '21': {'jp': '第4課 — 練習C', 'en': 'Practice C', 'desc': 'Drills setting appointments and verifying operational hours.', 'lesson': 4}, '22': {'jp': '第4課 — 会話：そちらは何時から何時までですか', 'en': 'Conversation', 'desc': 'Calling an institution to check its business operating hours.', 'lesson': 4}, '23': {'jp': '第5課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Directional movement particles (へ) along with methods of transit (で).', 'lesson': 5}, '24': {'jp': '第5課 — 練習C', 'en': 'Practice C', 'desc': 'Drills regarding holiday travel schedules and companion particles.', 'lesson': 5}, '25': {'jp': '第5課 — 会話：甲子園へ行きますか', 'en': 'Conversation', 'desc': 'Discussing weekend trip plans and holiday destinations with coworkers.', 'lesson': 5}, '26': {'jp': '第6課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Transitive verb objects (を) and identifying actions at locations (で).', 'lesson': 6}, '27': {'jp': '第6課 — 練習C', 'en': 'Practice C', 'desc': 'Drills practicing transactional activities and weekend hobbies.', 'lesson': 6}, '28': {'jp': '第6課 — 会話：一緒にいきませんか', 'en': 'Conversation', 'desc': 'Inviting a colleague out for lunch or to see a play.', 'lesson': 6}, '29': {'jp': '第7課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Specifying tools or languages used to complete actions (で) and gift exchanges.', 'lesson': 7}, '30': {'jp': '第7課 — 練習C', 'en': 'Practice C', 'desc': 'Practicing phrases for giving/receiving assistance and translating words.', 'lesson': 7}, '31': {'jp': '第7課 — 会話：ごめんください', 'en': 'Conversation', 'desc': "Visiting a Japanese colleague's home and presenting greetings.", 'lesson': 7}, '32': {'jp': '第8課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Introduction to い-adjectives and な-adjectives modifying nouns.', 'lesson': 8}, '33': {'jp': '第8課 — 練習C', 'en': 'Practice C', 'desc': 'Describing everyday items, local weather, and general impressions.', 'lesson': 8}, '34': {'jp': '第8課 — 会話：そろそろ失礼します', 'en': 'Conversation', 'desc': 'Politely wrapping up a social visit and thanking the host.', 'lesson': 8}, '35': {'jp': '第9課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Expressing likes, dislikes, capabilities, and basic reasons using から.', 'lesson': 9}, '36': {'jp': '第9課 — 練習C', 'en': 'Practice C', 'desc': 'Drills expressing personal preferences in foods, sports, and music.', 'lesson': 9}, '37': {'jp': '第9課 — 会話：残念です', 'en': 'Conversation', 'desc': 'Turning down a social offer politely due to a prior engagement.', 'lesson': 9}, '38': {'jp': '第10課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Existence grammar for objects (あります) and people/animals (います) with prepositions.', 'lesson': 10}, '39': {'jp': '第10課 — 練習C', 'en': 'Practice C', 'desc': 'Locating items inside rooms or indicating spatial positions.', 'lesson': 10}, '40': {'jp': '第10課 — 会話：ナンプラーがありますか', 'en': 'Conversation', 'desc': 'Searching for local international ingredients at a grocery store market counter.', 'lesson': 10}, '41': {'jp': '第11課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Counting generic objects, people, durations, and computing operational frequencies.', 'lesson': 11}, '42': {'jp': '第11課 — 練習C', 'en': 'Practice C', 'desc': 'Ordering food at an establishment or detailing time spent on tasks.', 'lesson': 11}, '43': {'jp': '第11課 — 会話：これ、お願いします', 'en': 'Conversation', 'desc': 'Sending a package overseas via specific mail streams at a post office counter.', 'lesson': 11}, '44': {'jp': '第12課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Past tense conjugations for nouns/adjectives and comparative sentence patterns.', 'lesson': 12}, '45': {'jp': '第12課 — 練習C', 'en': 'Practice C', 'desc': 'Comparing holiday experiences, seasons, and city environments.', 'lesson': 12}, '46': {'jp': '第12課 — 会話：祇園祭はどうでしたか', 'en': 'Conversation', 'desc': 'Sharing feedback and impressions about a local seasonal festival vacation.', 'lesson': 12}, '47': {'jp': '第13課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Expressing personal desires (〜が ほしいです / 〜たいです) and movement purposes.', 'lesson': 13}, '48': {'jp': '第13課 — 練習C', 'en': 'Practice C', 'desc': 'Inviting friends to complete targeted activities or matching shopping requests.', 'lesson': 13}, '49': {'jp': '第13課 — 会話：別々に お願いします', 'en': 'Conversation', 'desc': 'Settling a dinner bill with friends using separate transactions.', 'lesson': 13}, '50': {'jp': '第14課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Introduction to Te-form verb structures, polite requests (〜てください), and ongoing actions.', 'lesson': 14}, '51': {'jp': '第14課 — 練習C', 'en': 'Practice C', 'desc': 'Offering assistance and requesting actions from service workers.', 'lesson': 14}, '52': {'jp': '第14課 — 会話：梅田まで行ってください', 'en': 'Conversation', 'desc': 'Hailing a taxi cab and giving routing commands to a driver.', 'lesson': 14}, '53': {'jp': '第15課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Asking for permission (〜ても いいです) and showing prohibitions or states (〜ては いけません).', 'lesson': 15}, '54': {'jp': '第15課 — 練習C', 'en': 'Practice C', 'desc': 'Inquiring about occupations, marital statuses, and corporate residence.', 'lesson': 15}, '55': {'jp': '第15課 — 会話：ご家族は？', 'en': 'Conversation', 'desc': 'Casual workplace conversations sharing information about family members.', 'lesson': 15}, '56': {'jp': '第16課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Connecting multiple actions sequentially using Te-form and identifying features (〜は 〜が).', 'lesson': 16}, '57': {'jp': '第16課 — 練習C', 'en': 'Practice C', 'desc': 'Describing sequential routes or giving multi-step operational directives.', 'lesson': 16}, '58': {'jp': '第16課 — 会話：使い方を教えてください', 'en': 'Conversation', 'desc': "Learning how to navigate a local banking ATM machine with a friend's help.", 'lesson': 16}, '59': {'jp': '第17課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Introduction to Nai-form verbs, negative requests (〜ないでください), and obligations.', 'lesson': 17}, '60': {'jp': '第17課 — 練習C', 'en': 'Practice C', 'desc': 'Discussing schedules, required document deadlines, and medical routines.', 'lesson': 17}, '61': {'jp': '第17課 — 会話：どうしましたか', 'en': 'Conversation', 'desc': 'Visiting a medical practitioner to explain physical sickness symptoms.', 'lesson': 17}, '62': {'jp': '第18課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Introduction to Dictionary-form, expressing capabilities (〜ことができます), and detailing hobbies.', 'lesson': 18}, '63': {'jp': '第18課 — 練習C', 'en': 'Practice C', 'desc': 'Sharing specific hobbies and outlining structural sequences before actions occur.', 'lesson': 18}, '64': {'jp': '第18課 — 会話：趣味は何ですか', 'en': 'Conversation', 'desc': 'Discussing pastimes and specialized weekend hobbies with colleagues.', 'lesson': 18}, '65': {'jp': '第19課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Introduction to Ta-form verbs, discussing past experiences (〜た ことがあります), and listing actions.', 'lesson': 19}, '66': {'jp': '第19課 — 練習C', 'en': 'Practice C', 'desc': 'Sharing unusual personal experiences or tracking changes in states.', 'lesson': 19}, '67': {'jp': '第19課 — 会話：ダイエットは明日からします', 'en': 'Conversation', 'desc': 'Discussing healthy lifestyle changes and routine health choices.', 'lesson': 19}, '68': {'jp': '第20課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Mastering casual form vs. polite form conjugations for verbs and adjectives.', 'lesson': 20}, '69': {'jp': '第20課 — 練習C', 'en': 'Practice C', 'desc': 'Casual daily check-ins and relaxed conversations among close peers.', 'lesson': 20}, '70': {'jp': '第20課 — 会話：一緒に行かない？', 'en': 'Conversation', 'desc': 'Inviting a close friend out to a weekend event using natural, informal Japanese speech.', 'lesson': 20}, '71': {'jp': '第21課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Expressing personal thoughts (〜と思います) and quoting spoken statements (〜と言いました).', 'lesson': 21}, '72': {'jp': '第21課 — 練習C', 'en': 'Practice C', 'desc': 'Exchanging viewpoints on social topics or current events.', 'lesson': 21}, '73': {'jp': '第21課 — 会話：私もそう思います', 'en': 'Conversation', 'desc': 'Coworkers discussing meeting outcomes and verifying agreements.', 'lesson': 21}, '74': {'jp': '第22課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Constructing complex relative clauses (using full sentences to modify a noun).', 'lesson': 22}, '75': {'jp': '第22課 — 練習C', 'en': 'Practice C', 'desc': 'Describing specific types of items owned or people met using detailed descriptions.', 'lesson': 22}, '76': {'jp': '第22課 — 会話：どんな部屋をお探しですか', 'en': 'Conversation', 'desc': 'Visiting a housing real estate office to find a specific apartment layout.', 'lesson': 22}, '77': {'jp': '第23課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Expressing timing factors using 〜とき and conditional cause-and-effect natural laws using 〜と.', 'lesson': 23}, '78': {'jp': '第23課 — 練習C', 'en': 'Practice C', 'desc': 'Giving road directions or advising on how to run devices.', 'lesson': 23}, '79': {'jp': '第23課 — 会話：どうやって行きますか', 'en': 'Conversation', 'desc': 'Asking a resident for step-by-step navigation instructions to a nearby landmark.', 'lesson': 23}, '80': {'jp': '第24課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Mastering directional verbs of giving and receiving favors (〜てくれます / 〜てもらいます / 〜てあげます).', 'lesson': 24}, '81': {'jp': '第24課 — 練習C', 'en': 'Practice C', 'desc': 'Expressing gratitude for helpful actions performed by friends or peers.', 'lesson': 24}, '82': {'jp': '第24課 — 会話：手伝ってくれますか', 'en': 'Conversation', 'desc': 'Asking a friend to assist with home tasks or moving logistics.', 'lesson': 24}, '83': {'jp': '第25課 — 文型・例文', 'en': 'Sentence Patterns & Examples', 'desc': 'Constructing past conditional clauses using 〜たら and concessive patterns using 〜ても.', 'lesson': 25}, '84': {'jp': '第25課 — 練習C', 'en': 'Practice C', 'desc': 'Discussing future life options, career paths, and complex conditional events.', 'lesson': 25}, '85': {'jp': '第25課 — 会話：いろいろお世話になりました', 'en': 'Conversation', 'desc': 'A heartfelt final farewell conversation as Mr. Miller prepares to leave his assignment.', 'lesson': 25}, '86': {'jp': '総復習 — 1', 'en': 'General Review / Comprehensive Drill 1', 'desc': 'Cumulative listening evaluation covering structural units from Lessons 1 through 12.', 'lesson': None}, '87': {'jp': '総復習 — 2', 'en': 'General Review / Comprehensive Drill 2', 'desc': 'Cumulative listening evaluation covering structural units from Lessons 13 through 25.', 'lesson': None}}, 'lessons': {'1': {'jp': '初めまして', 'en': 'Nice to meet you'}, '2': {'jp': 'ほんの気持ちです', 'en': "It's nothing much / A token of my appreciation"}, '3': {'jp': 'これをください', 'en': 'Give me this one, please'}, '4': {'jp': 'そちらは何時から何時までですか', 'en': 'What time are you open from and until?'}, '5': {'jp': '甲子園へ行きますか', 'en': 'Are you going to Koshien?'}, '6': {'jp': '一緒にいきませんか', 'en': "Won't you come with us?"}, '7': {'jp': 'ごめんください', 'en': 'Excuse me, anyone home?'}, '8': {'jp': 'そろそろ失礼します', 'en': "It's time I should be leaving"}, '9': {'jp': '残念です', 'en': "That's a pity / I'm sorry to hear that"}, '10': {'jp': 'ナンプラーがありますか', 'en': 'Do you have fish sauce?'}, '11': {'jp': 'これ、お願いします', 'en': 'Please send this, please'}, '12': {'jp': '祇園祭はどうでしたか', 'en': 'How was the Gion Festival?'}, '13': {'jp': '別々に お願いします', 'en': 'Separately, please / Separate checks, please'}, '14': {'jp': '梅田まで行ってください', 'en': 'Please take me to Umeda'}, '15': {'jp': 'ご家族は？', 'en': 'What about your family?'}, '16': {'jp': '使い方を教えてください', 'en': 'Please tell me how to use it'}, '17': {'jp': 'どうしましたか', 'en': "What's the matter? / What's wrong?"}, '18': {'jp': '趣味は何ですか', 'en': 'What is your hobby?'}, '19': {'jp': 'ダイエットは明日からします', 'en': "I'll start my diet tomorrow"}, '20': {'jp': '一緒に行かない？', 'en': "Won't you come with us? - Casual"}, '21': {'jp': '私もそう思います', 'en': 'I think so, too'}, '22': {'jp': 'どんな部屋をお探しですか', 'en': 'What kind of room are you looking for?'}, '23': {'jp': 'どうやって行きますか', 'en': 'How do I get there?'}, '24': {'jp': '手伝ってくれますか', 'en': 'Could you help me out?'}, '25': {'jp': 'いろいろお世話になりました', 'en': "Thank you for everything you've done for me"}}}
TR, LS = CAT['tracks'], CAT['lessons']

# ---- 1. enrich data files -------------------------------------------------
files = sorted(glob.glob('data/lessons/*/honsatsu-audio.json'))
if not files:
    sys.exit('No honsatsu-audio.json found. Run from the repo root.')
count = 0
for f in files:
    d = json.load(open(f, encoding='utf-8'))
    slug = d.get('lessonSlug') or d.get('slug')
    out = {'lessonSlug': slug}
    ln = int(slug.split('-')[1])
    if str(ln) in LS:
        out['lesson'] = {'no': ln, 'jp': LS[str(ln)]['jp'], 'en': LS[str(ln)]['en']}
    out['tracks'] = []
    for t in d['tracks']:
        n = int(t['id'].split('-')[1])
        c = TR[str(n)]
        if n <= 10 or n >= 86:
            en = c['en']
        elif t['type'] == 'conversation':
            en = 'Conversation: ' + LS[str(c['lesson'])]['en']
        else:
            en = c['en']
        nt = {'id': t['id'], 'trackNo': n, 'type': t['type'],
              'title': {'en': en, 'bn': en}, 'jp': c['jp'], 'desc': {'en': c['desc']}}
        img = t.get('image')
        if img:
            nt['image'] = img
        nt['audioUrl'] = t.get('audioUrl') or t.get('audio_url')
        out['tracks'].append(nt)
        count += 1
    with open(f, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
print('data enriched: %d tracks in %d files' % (count, len(files)))

# ---- 2. schema ------------------------------------------------------------
p = 'js/data-schemas.js'
s = open(p, encoding='utf-8').read()
if 'trackNo' in s:
    print('schema already patched')
else:
    a = re.search(r"lessonSlug:[^\n]*\n", s)
    b = re.search(r"audioUrl:\s*nonEmptyString\s*\n", s)
    if not (a and b):
        print('schema NOT patched (anchors missing)')
    else:
        lesson = ("      lesson: { type: 'object', required: ['no', 'jp', 'en'], properties: { "
                  "no: { type: 'number', integer: true, min: 1 }, jp: nonEmptyString, en: nonEmptyString }, additionalProperties: false },\n")
        extra = ("audioUrl: nonEmptyString,\n"
                 "            trackNo:  { type: 'number', integer: true, min: 1, max: 87 },\n"
                 "            jp:       nonEmptyString,\n"
                 "            desc:     { type: 'object', required: ['en'], properties: { en: nonEmptyString, bn: { type: 'string' } }, additionalProperties: false },\n"
                 "            image:    { type: 'string' }\n")
        s = s[:b.start()] + extra + s[b.end():]
        s = s[:a.end()] + lesson + s[a.end():]
        open(p, 'w', encoding='utf-8').write(s)
        print('schema patched')

# ---- 3. lesson.html -------------------------------------------------------
p = 'lesson.html'
s = open(p, encoding='utf-8').read()
if 'renderHonsatsu' in s:
    print('lesson.html already patched')
else:
    ok = True
    m = re.search(r"const honsatsu = state\.data\.honsatsuAudio;.*?(?=const listHtml)", s, re.S)
    if not m:
        ok = False
    else:
        s = s[:m.start()] + "const honsatsuHtml = renderHonsatsu(state.data.honsatsuAudio);\n\n      " + s[m.end():]
    k = s.find('function renderListening(list) {')
    if k < 0:
        ok = False
    else:
        s = s[:k] + JS_RENDER + '    ' + s[k:]
    s = s.replace("'conversation': { en: 'Conversation', bn: 'কথোপকথন' }",
                  "'conversation': { en: 'Conversation', bn: 'কথোপকথন' },\n        'intro': { en: 'Introduction', bn: 'ভূমিকা' },\n        'review': { en: 'Review', bn: 'পুনরালোচনা' }")
    if '</head>' not in s:
        ok = False
    else:
        s = s.replace('</head>', CSS + '</head>', 1)
    if ok:
        open(p, 'w', encoding='utf-8').write(s)
        print('lesson.html patched')
    else:
        print('lesson.html NOT patched (anchors missing) - nothing written')

# ---- 4. image attach tool -------------------------------------------------
open('tools/attach-honsatsu-images.mjs', 'w', encoding='utf-8').write(ATTACH)
print('tools/attach-honsatsu-images.mjs written')
