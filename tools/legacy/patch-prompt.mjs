import fs from 'fs';
var p = 'supabase/functions/voice-tutor/index.ts';
var s = fs.readFileSync(p, 'utf8');
if (s.indexOf('interview:') >= 0) { console.log('already patched'); process.exit(0); }

var T0 = 'const TOPICS: Record<string, string> = {';
var T1 = 'function json(';
var HT = '"How to talk:\\n" +';
var BV = /const BUILD = "v\d+";/;
if (s.indexOf(T0) < 0 || s.indexOf(T1) < 0 || s.indexOf(HT) < 0 || !BV.test(s)) {
  console.log('anchor not found (TOPICS / json / How to talk / BUILD)'); process.exit(1);
}

var TOPICS = [
'const TOPICS: Record<string, string> = {',
'  free: "Free conversation about everyday life at the learner\'s level.",',
'  intro: "Self-introduction practice: name, country (〜から来ました), whether they are a student, 〜です. Act like someone meeting them for the first time.",',
'  hobby: "Hobbies and weekends: simple likes (〜が好きです) and weekend activities (〜をします).",',
'  food: "Food: asking what something is (これ、何ですか), ordering, and simple opinions (おいしいです). Role-play restaurant staff when natural.",',
'  daily: "Daily needs: asking prices (いくらですか), where things are (どこですか) and asking for help in shops (〜をお願いします). Role-play a shop clerk when natural.",',
'  weather: "Weather small talk as a safe icebreaker (暑いですね、雨ですね、いい天気ですね).",',
'  interview: "Part-time job interview. You are the friendly manager of a shop or restaurant interviewing the learner. Go step by step, one question at a time: greeting and entering the room (失礼します), their name (〜と申します), visa type and school hours (学生ビザです、〜から〜まで), days they can work (〜曜日に働けます) and commute time (電車で〜分), experience or willingness (経験があります、頑張ります). Stay polite and encouraging, and finish by thanking them.",',
'  travel: "Travel: directions, trains, hotels and sightseeing. Role-play station staff or a hotel clerk when natural.",',
'  shop: "Shopping: prices, sizes, colors and paying. Role-play a shop clerk when natural.",',
'};',
'',
''
].join('\n');

var RULES = [
'"- Use aizuchi like a real Japanese listener: begin most replies with a short backchannel such as はい、 / そうですか。 / へえー。 / なるほど。 / いいですね。 and vary it.\\n" +',
'"- Keep sentences short and simple, subject + object + verb (私は寿司を食べます). Use easy positive adjectives like 楽しい、おいしい、すごい. Always stay polite (です/ます).\\n" +',
'"- If the learner says もう一度お願いします or seems not to understand, repeat your last sentence once, slower and simpler.\\n" +'
].join('\n      ');

var a = s.indexOf(T0), b = s.indexOf(T1);
if (b <= a) { console.log('TOPICS block order unexpected'); process.exit(1); }
s = s.slice(0, a) + TOPICS + s.slice(b);
s = s.replace(HT, function () { return HT + '\n      ' + RULES; });
s = s.replace(BV, 'const BUILD = "v6";');
fs.writeFileSync(p, s);
console.log('prompt patched (v6)');
