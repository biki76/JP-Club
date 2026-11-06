import fs from 'fs';

function edit(file, pairs) {
  if (!fs.existsSync(file)) { console.log('missing file: ' + file); return null; }
  var s = fs.readFileSync(file, 'utf8'), changed = false;
  pairs.forEach(function (pr) {
    if (s.indexOf(pr[1]) >= 0) return;
    if (s.indexOf(pr[0]) < 0) { console.log(file + ': anchor not found: ' + pr[0].slice(0, 60)); return; }
    s = s.replace(pr[0], function () { return pr[1]; });
    changed = true;
  });
  if (changed) { fs.writeFileSync(file, s); console.log('patched ' + file); }
  return s;
}

var ID = "Identity: your name is Moon (ムーン). You are the AI speaking tutor of JP-Club by Nihonsync, a site that helps Bengali-speaking learners practice Japanese. When asked who you are, your name, who made you or what you are, say you are Moon, JP-Club's AI tutor from Nihonsync, in Japanese at the learner's level. Never call yourself ChatGPT, GPT, OpenAI, Claude, Gemini or any other model or company name. If asked which AI model or company is behind you, say you are JP-Club's tutor and do not know the technical details. If asked whether you are an AI, say yes briefly. Never claim to be human.";

edit('supabase/functions/voice-tutor/index.ts', [
  ['const BUILD = "v4";', 'const BUILD = "v5";'],
  ['You are Yuki, a warm, easygoing native Japanese speaker', 'You are Moon (ムーン), a warm, easygoing native Japanese speaker'],
  ["If the learner sincerely asks whether you are an AI, say yes briefly, then carry on.", ID],
  ['(Start: greet me casually in one short sentence and ask one easy question.)', '(Start: greet me casually in one short sentence, tell me you are Moon, and ask one easy question.)']
]);

edit('tutor.html', [
  ['data-en="Speaking Partner" data-bn="স্পিকিং পার্টনার">Speaking Partner</span>', 'data-en="Moon · Speaking Partner" data-bn="মুন · স্পিকিং পার্টনার">Moon · Speaking Partner</span>']
]);

var js = edit('js/tutor-voice.js', [
  ["$('tl-topic').innerHTML = T(l[0], l[1]);", "$('tl-topic').innerHTML = 'Moon · ' + T(l[0], l[1]);"],
  ["var a = new Audio('data:audio/mp3;base64,' + b64);", "var a = new Audio('data:audio/mp3;base64,' + b64);\n      a.playbackRate = Math.min(1.25, Math.max(0.7, (parseFloat(rateEl.value) || 0.9) / 0.9));"]
]);
if (js && js.indexOf("'Female - Aoede'") >= 0) {
  js = js.replace(/\[\['n:female'[\s\S]*?\]\]\.forEach/, function () { return "[['n:female', 'Natural - Moon']].forEach"; });
  fs.writeFileSync('js/tutor-voice.js', js);
  console.log('voice list simplified');
}
