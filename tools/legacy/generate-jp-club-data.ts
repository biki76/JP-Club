import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

interface Manifest { slug: string; courseId: string; lessonNumber: number; title: { en: string; bn: string; }; subtitle: { en: string; bn: string; }; jlpt: string; durationMin: number; dataFiles: { vocabulary: string; grammar: string; kanji: string; }; tags: string[]; }
interface VocabularyWord { id: string; kanji?: string; furigana: string; romaji: string; english_meaning: string; bengali_meaning: string; tags: string[]; }
interface GrammarExample { jp: string; furigana: string; romaji: string; en: string; bn: string; }
interface GrammarPoint { id: string; pattern: string; meaning_en: string; meaning_bn: string; examples: GrammarExample[]; tags: string[]; }
interface KanjiEntry { character: string; onyomi: string[]; kunyomi: string[]; meanings: { en: string[]; bn: string[]; }; radicals: string[]; strokes: number; grade: number; jlpt: string; }
interface PracticeQuestion { id: string; type: string; prompt: { en: string; bn: string; }; stem: { jp: string; furigana: string; romaji: string; }; options: string[]; correctIndex: number; explanation: { en: string; bn: string; }; }
interface ReadingPassage { id: string; title: { en: string; bn: string; }; passage: Array<{ jp: string; furigana: string; romaji: string; en: string; bn: string; }>; }
interface ListeningItem { id: string; title: { en: string; bn: string; }; audio_url: string; transcript: Array<{ jp: string; furigana: string; romaji: string; en: string; bn: string; }>; }
interface MinnaWord { id: [number, number]; edition: number[]; kanji: string | null; kana: string; romaji: string; meaning: { en: string; fr: string; }; }
type MinnaDataset = Record<string, MinnaWord[]>;

const lessonMeta = [
  { number: 1, titleEn: 'Introductions', titleBn: 'পরিচিতি', subtitleEn: 'はじめまして', subtitleBn: 'প্রথম পরিচয়', jlpt: 'N5', durationMin: 45, tags: ['n5', 'greetings', 'self-introduction'] },
  { number: 2, titleEn: 'Objects & Demonstratives', titleBn: 'বস্তু ও প্রদর্শক', subtitleEn: 'これから お世話に なります', subtitleBn: 'এখন থেকে আপনার যত্নে', jlpt: 'N5', durationMin: 40, tags: ['n5', 'objects'] },
  { number: 3, titleEn: 'Places & Shopping', titleBn: 'স্থান ও কেনাকাটা', subtitleEn: 'これを ください', subtitleBn: 'এটি দিন', jlpt: 'N5', durationMin: 45, tags: ['n5', 'shopping'] },
  { number: 4, titleEn: 'Time & Schedules', titleBn: 'সময় ও সময়সূচি', subtitleEn: 'そちらは 何時までですか', subtitleBn: 'সেটি কতটা পর্যন্ত?', jlpt: 'N5', durationMin: 50, tags: ['n5', 'time'] },
  { number: 5, titleEn: 'Transportation', titleBn: 'পরিবহন', subtitleEn: 'この電車は 甲子園へ 行きますか', subtitleBn: 'এই ট্রেন কি কোশিয়েনে যায়?', jlpt: 'N5', durationMin: 50, tags: ['n5', 'transport'] },
  { number: 6, titleEn: 'Invitations', titleBn: 'আমন্ত্রণ', subtitleEn: 'いっしょに 行きませんか', subtitleBn: 'একসাথে যাবেন না?', jlpt: 'N5', durationMin: 45, tags: ['n5', 'invitations'] },
  { number: 7, titleEn: 'Giving & Receiving', titleBn: 'দেওয়া-নেওয়া', subtitleEn: 'いらっしゃい', subtitleBn: 'স্বাগতম', jlpt: 'N5', durationMin: 45, tags: ['n5', 'giving'] },
  { number: 8, titleEn: 'Adjectives', titleBn: 'বিশেষণ', subtitleEn: 'そろそろ 失礼します', subtitleBn: 'এখন বিদায় নিচ্ছি', jlpt: 'N5', durationMin: 45, tags: ['n5', 'adjectives'] },
  { number: 9, titleEn: 'Preferences', titleBn: 'পছন্দ', subtitleEn: '残念ですが', subtitleBn: 'দুঃখিত তবে', jlpt: 'N5', durationMin: 50, tags: ['n5', 'preferences'] },
  { number: 10, titleEn: 'Existence', titleBn: 'অস্তিত্ব', subtitleEn: 'ナンプラー、ありますか', subtitleBn: 'নামপ্লা আছে?', jlpt: 'N5', durationMin: 45, tags: ['n5', 'existence'] },
  { number: 11, titleEn: 'Counters', titleBn: 'গণনা', subtitleEn: 'これ、お願いします', subtitleBn: 'এটি, দয়া করে', jlpt: 'N5', durationMin: 50, tags: ['n5', 'counters'] },
  { number: 12, titleEn: 'Comparison', titleBn: 'তুলনা', subtitleEn: '祇園祭は どうでしたか', subtitleBn: 'গিওন মাতসুরি কেমন ছিল?', jlpt: 'N5', durationMin: 50, tags: ['n5', 'comparison'] },
  { number: 13, titleEn: 'Desires', titleBn: 'ইচ্ছা', subtitleEn: '別々に お願いします', subtitleBn: 'আলাদা আলাদা দিন', jlpt: 'N5', durationMin: 45, tags: ['n5', 'desire'] },
  { number: 14, titleEn: 'て-Form', titleBn: 'て-রূপ', subtitleEn: 'みどり町まで お願いします', subtitleBn: 'মিদোরিচো পর্যন্ত', jlpt: 'N5', durationMin: 50, tags: ['n5', 'te-form'] },
  { number: 15, titleEn: 'Permission', titleBn: 'অনুমতি', subtitleEn: 'ご家族は？', subtitleBn: 'আপনার পরিবার?', jlpt: 'N5', durationMin: 45, tags: ['n5', 'permission'] },
  { number: 16, titleEn: 'Sequencing', titleBn: 'ক্রম', subtitleEn: '使い方を 教えて ください', subtitleBn: 'ব্যবহার শিখিয়ে দিন', jlpt: 'N5', durationMin: 50, tags: ['n5', 'sequencing'] },
  { number: 17, titleEn: 'ない-Form', titleBn: 'ない-রূপ', subtitleEn: 'どう しましたか', subtitleBn: 'কি হয়েছে?', jlpt: 'N5', durationMin: 50, tags: ['n5', 'nai-form'] },
  { number: 18, titleEn: 'Hobbies', titleBn: 'শখ', subtitleEn: '趣味は 何ですか', subtitleBn: 'আপনার শখ কি?', jlpt: 'N5', durationMin: 45, tags: ['n5', 'hobbies'] },
  { number: 19, titleEn: 'Experiences', titleBn: 'অভিজ্ঞতা', subtitleEn: 'ダイエットは あしたから します', subtitleBn: 'ডায়েট কাল থেকে', jlpt: 'N5', durationMin: 50, tags: ['n5', 'experience'] },
  { number: 20, titleEn: 'Casual Speech', titleBn: 'সাধারণ ভাষা', subtitleEn: 'いっしょに 行かない？', subtitleBn: 'একসাথে যাবে না?', jlpt: 'N5', durationMin: 45, tags: ['n5', 'casual'] },
  { number: 21, titleEn: 'Opinions', titleBn: 'মতামত', subtitleEn: 'わたしも そう 思います', subtitleBn: 'আমিও তাই মনে করি', jlpt: 'N5', durationMin: 45, tags: ['n5', 'opinions'] },
  { number: 22, titleEn: 'Noun Modification', titleBn: 'বিশেষ্য রূপান্তর', subtitleEn: 'どんな 部屋を お探しですか', subtitleBn: 'কেমন ঘর খুঁজছেন?', jlpt: 'N5', durationMin: 50, tags: ['n5', 'noun-mod'] },
  { number: 23, titleEn: 'Directions', titleBn: 'দিক', subtitleEn: 'どうやって 行きますか', subtitleBn: 'কীভাবে যাবেন?', jlpt: 'N5', durationMin: 50, tags: ['n5', 'directions'] },
  { number: 24, titleEn: 'Helping', titleBn: 'সাহায্য', subtitleEn: '手伝いに 行きましょうか', subtitleBn: 'সাহায্য করতে যাব?', jlpt: 'N5', durationMin: 45, tags: ['n5', 'help'] },
  { number: 25, titleEn: 'N5 Review', titleBn: 'N5 পুনরালোচনা', subtitleEn: 'いろいろ お世話に なりました', subtitleBn: 'বিভিন্নভাবে যত্নে', jlpt: 'N5', durationMin: 60, tags: ['n5', 'review'] },
  { number: 26, titleEn: 'Explanations', titleBn: 'ব্যাখ্যা', subtitleEn: 'ごみは どこに 出したら いいですか', subtitleBn: 'ময়লা কোথায় ফেলব?', jlpt: 'N4', durationMin: 50, tags: ['n4', 'explanations'] },
  { number: 27, titleEn: 'Potential', titleBn: 'সম্ভাবনা', subtitleEn: '何でも 作れるんですね', subtitleBn: 'সবকিছু বানাতে পারেন!', jlpt: 'N4', durationMin: 50, tags: ['n4', 'potential'] },
  { number: 28, titleEn: 'Reasons', titleBn: 'কারণ', subtitleEn: '出張も 多いし、試験も あるし…', subtitleBn: 'ভ্রমণও বেশি, পরীক্ষাও…', jlpt: 'N4', durationMin: 50, tags: ['n4', 'reasons'] },
  { number: 29, titleEn: 'Regret', titleBn: 'অনুশোচনা', subtitleEn: '忘れ物を して しまったんです', subtitleBn: 'জিনিস ভুলে গিয়েছি', jlpt: 'N4', durationMin: 50, tags: ['n4', 'regret'] },
  { number: 30, titleEn: 'Preparation', titleBn: 'প্রস্তুতি', subtitleEn: '非常袋を 準備して おかないと', subtitleBn: 'জরুরি ব্যাগ প্রস্তুত রাখতে হবে', jlpt: 'N4', durationMin: 50, tags: ['n4', 'preparation'] },
  { number: 31, titleEn: 'Intentions', titleBn: 'ইচ্ছা', subtitleEn: '料理を 習おうと 思って います', subtitleBn: 'রান্না শিখব ভাবছি', jlpt: 'N4', durationMin: 50, tags: ['n4', 'intention'] },
  { number: 32, titleEn: 'Advice', titleBn: 'পরামর্শ', subtitleEn: '無理を しない ほうが いいですよ', subtitleBn: 'অতিরিক্ত চেষ্টা না করাই ভাল', jlpt: 'N4', durationMin: 45, tags: ['n4', 'advice'] },
  { number: 33, titleEn: 'Commands', titleBn: 'আদেশ', subtitleEn: 'これは どういう 意味ですか', subtitleBn: 'এর মানে কি?', jlpt: 'N4', durationMin: 50, tags: ['n4', 'commands'] },
  { number: 34, titleEn: 'Procedures', titleBn: 'প্রক্রিয়া', subtitleEn: 'わたしが した とおりに、して ください', subtitleBn: 'আমি যেমন করেছি তেমন করুন', jlpt: 'N4', durationMin: 50, tags: ['n4', 'procedures'] },
  { number: 35, titleEn: 'Conditionals', titleBn: 'শর্ত', subtitleEn: 'どこか いい 所、ありませんか', subtitleBn: 'কোথাও ভাল জায়গা নেই?', jlpt: 'N4', durationMin: 50, tags: ['n4', 'conditionals'] },
  { number: 36, titleEn: 'Habits', titleBn: 'অভ্যাস', subtitleEn: '毎日 運動するように して います', subtitleBn: 'প্রতিদিন ব্যায়াম করি', jlpt: 'N4', durationMin: 50, tags: ['n4', 'habits'] },
  { number: 37, titleEn: 'Passive Voice', titleBn: 'কর্মবাচ্য', subtitleEn: '金閣寺は 14世紀に 建てられました', subtitleBn: 'কিংকাকুজি ১৪ শতকে নির্মিত', jlpt: 'N4', durationMin: 55, tags: ['n4', 'passive'] },
  { number: 38, titleEn: 'Nominalization', titleBn: 'বিশেষ্যায়ন', subtitleEn: '片づけるのが 好きなんです', subtitleBn: 'গুছিয়ে রাখতে পছন্দ করি', jlpt: 'N4', durationMin: 50, tags: ['n4', 'nominalization'] },
  { number: 39, titleEn: 'Apologies', titleBn: 'ক্ষমাপ্রার্থনা', subtitleEn: '遅れて、すみません', subtitleBn: 'দেরি করে ফেলেছি, দুঃখিত', jlpt: 'N4', durationMin: 50, tags: ['n4', 'apology'] },
  { number: 40, titleEn: 'Topic Changes', titleBn: 'বিষয় পরিবর্তন', subtitleEn: 'ところで、…', subtitleBn: 'যাই হোক, …', jlpt: 'N4', durationMin: 45, tags: ['n4', 'topic-change'] },
  { number: 41, titleEn: 'Purpose', titleBn: 'উদ্দেশ্য', subtitleEn: '〜ために、〜のに', subtitleBn: '〜এর জন্য, 〜এর জন্য', jlpt: 'N4', durationMin: 50, tags: ['n4', 'purpose'] },
  { number: 42, titleEn: 'Purpose Applied', titleBn: 'উদ্দেশ্য (প্রয়োগ)', subtitleEn: '〜ために、〜のに (応用)', subtitleBn: '〜এর জন্য (প্রয়োগ)', jlpt: 'N4', durationMin: 50, tags: ['n4', 'purpose'] },
  { number: 43, titleEn: 'Appearance', titleBn: 'চেহারা', subtitleEn: '毎日 楽しそうです', subtitleBn: 'প্রতিদিন আনন্দে আছে', jlpt: 'N4', durationMin: 50, tags: ['n4', 'appearance'] },
  { number: 44, titleEn: 'Comparison', titleBn: 'তুলনা', subtitleEn: 'この写真みたいに して ください', subtitleBn: 'এই ছবির মতো করুন', jlpt: 'N4', durationMin: 50, tags: ['n4', 'comparison'] },
  { number: 45, titleEn: 'Hypotheticals', titleBn: 'অনুমান', subtitleEn: 'コースを まちがえた 場合は…', subtitleBn: 'কোর্স ভুল হলে কী করব?', jlpt: 'N4', durationMin: 50, tags: ['n4', 'hypothetical'] },
  { number: 46, titleEn: 'Time-Aspect', titleBn: 'সময়-দিক', subtitleEn: '先週 直して もらった ばかりなのに…', subtitleBn: 'গত সপ্তাহে ঠিক করিয়েছি, তবুও…', jlpt: 'N4', durationMin: 50, tags: ['n4', 'time-aspect'] },
  { number: 47, titleEn: 'Hearsay', titleBn: 'শ্রুতিমূলক', subtitleEn: '婚約したそうです', subtitleBn: 'বাগদান করেছে শুনেছি', jlpt: 'N4', durationMin: 50, tags: ['n4', 'hearsay'] },
  { number: 48, titleEn: 'Causative', titleBn: 'প্রেরণা', subtitleEn: '休ませて いただけませんか', subtitleBn: 'বিশ্রাম নিতে পারি না?', jlpt: 'N4', durationMin: 55, tags: ['n4', 'causative'] },
  { number: 49, titleEn: 'Respectful Language', titleBn: 'সম্মানসূচক ভাষা', subtitleEn: 'よろしく お伝え ください', subtitleBn: 'শুভেচ্ছা পৌঁছে দেবেন', jlpt: 'N4', durationMin: 55, tags: ['n4', 'sonkeigo'] },
  { number: 50, titleEn: 'Humble Language', titleBn: 'বিনয়ী ভাষা', subtitleEn: '心から 感謝いたします', subtitleBn: 'আন্তরিক ধন্যবাদ জানাই', jlpt: 'N4', durationMin: 60, tags: ['n4', 'kenjogo'] },
];

const grammarPatterns: Record<number, Array<[string, string, string]>> = {
  1: [['N は N です', 'A is B', 'A হলো B'], ['N は N じゃありません', 'A is not B', 'A নয় B']],
  2: [['これ / それ / あれ', 'this / that', 'এটি / সেটি'], ['N の N', 'noun modifier', 'বিশেষ্য রূপান্তর']],
  3: [['ここ / そこ / あそこ', 'here / there', 'এখানে / সেখানে'], ['N を ください', 'please give me N', 'N দিন']],
  4: [['〜時 / 〜分', 'hour / minute', 'ঘণ্টা / মিনিট'], ['〜から 〜まで', 'from ~ to ~', '~ থেকে ~ পর্যন্ত']],
  5: [['〜へ 行きます', 'go to ~', '~তে যাই'], ['〜で 行きます', 'go by ~', '~দিয়ে যাই']],
  6: [['〜を 〜ます', 'do ~', '~ করি'], ['〜ませんか', 'won\'t you ~?', '~ করবেন না?']],
  7: [['〜で 〜ます', 'do ~ with', '~ দিয়ে ~ করি'], ['〜を あげます', 'give ~', '~ দিই']],
  8: [['い-adjective', 'i-adjective', 'ই-বিশেষণ'], ['な-adjective', 'na-adjective', 'না-বিশেষণ']],
  9: [['〜が 好きです', 'like ~', '~ পছন্দ'], ['〜が わかります', 'understand ~', '~ বুঝি']],
  10: [['〜が あります / います', 'there is ~', '~ আছে'], ['〜に あります / います', 'exists at ~', '~এ আছে']],
};

async function generateAll(): Promise<void> {
  console.log('🚀 Starting generation...');
  const YAML_URL = 'https://raw.githubusercontent.com/vitto4/MinnaNoDS/main/minna-no-ds.yaml';
  console.log('📥 Fetching YAML data...');
  
  const res = await fetch(YAML_URL);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
  const rawYaml = await res.text();
  const dataset = yaml.load(rawYaml) as MinnaDataset;
  console.log('✅ YAML loaded.');

  const vocabByLesson: Record<number, MinnaWord[]> = {};
  for (const [key, words] of Object.entries(dataset)) {
    if (!key.startsWith('lesson-')) continue;
    vocabByLesson[parseInt(key.replace('lesson-', ''), 10)] = words;
  }

  const baseDir = path.join(process.cwd(), 'data', 'lessons');
  await fs.mkdir(baseDir, { recursive: true });
  const manifests: string[] = [];

  for (const meta of lessonMeta) {
    const num = meta.number;
    const slug = `minna-${num.toString().padStart(3, '0')}`;
    const lessonDir = path.join(baseDir, slug);
    await fs.mkdir(lessonDir, { recursive: true });

    const words = vocabByLesson[num] ?? [];

    await fs.writeFile(path.join(lessonDir, 'manifest.json'), JSON.stringify({
      slug, courseId: 'minna-beginner', lessonNumber: num,
      title: { en: meta.titleEn, bn: meta.titleBn }, subtitle: { en: meta.subtitleEn, bn: meta.subtitleBn },
      jlpt: meta.jlpt, durationMin: meta.durationMin, dataFiles: { vocabulary: 'vocabulary.json', grammar: 'grammar.json', kanji: 'kanji.json' }, tags: meta.tags,
    }, null, 2), 'utf8');
    manifests.push(`${slug}/manifest.json`);

    await fs.writeFile(path.join(lessonDir, 'vocabulary.json'), JSON.stringify(words.map((w) => ({
      id: `${slug}-v${w.id[1].toString().padStart(3, '0')}`, kanji: w.kanji ?? undefined, furigana: w.kana, romaji: w.romaji,
      english_meaning: w.meaning.en, bengali_meaning: w.meaning.en, tags: ['vocabulary', `lesson-${num}`],
    })), null, 2), 'utf8');

    const patterns = grammarPatterns[num] ?? [['Review', 'review', 'পুনরালোচনা']];
    const grammar = patterns.map(([pattern, mEn, mBn], idx) => {
      const sw = words[0] || { kanji: 'N', kana: 'N', romaji: 'N' };
      const ex = `${sw.kanji ?? sw.kana} は ${sw.kanji ?? sw.kana} です。`;
      return { id: `${slug}-g${idx + 1}`, pattern, meaning_en: mEn, meaning_bn: mBn, examples: [{ jp: ex, furigana: ex, romaji: ex, en: 'Example', bn: 'উদাহরণ' }], tags: ['grammar'] };
    });
    await fs.writeFile(path.join(lessonDir, 'grammar.json'), JSON.stringify(grammar, null, 2), 'utf8');

    await fs.writeFile(path.join(lessonDir, 'kanji.json'), JSON.stringify([], null, 2), 'utf8');

    const practice: any[] = [];
    if (words.length > 0) {
      practice.push({ id: `${slug}-p001`, type: 'multiple-choice', prompt: { en: 'Meaning?', bn: 'অর্থ?' }, stem: { jp: words[0].kanji ?? words[0].kana, furigana: words[0].kana, romaji: words[0].romaji }, options: [words[0].meaning.en, 'Wrong', 'Wrong', 'Wrong'], correctIndex: 0, explanation: { en: 'Correct', bn: 'সঠিক' } });
    }
    await fs.writeFile(path.join(lessonDir, 'practice.json'), JSON.stringify(practice, null, 2), 'utf8');

    await fs.writeFile(path.join(lessonDir, 'reading.json'), JSON.stringify([{ id: `${slug}-r001`, title: { en: 'Passage', bn: 'অনুচ্ছেদ' }, passage: [{ jp: 'これは ペン です。', furigana: 'これは ぺん です。', romaji: 'Kore wa pen desu.', en: 'This is a pen.', bn: 'এটি একটি কলম।' }] }], null, 2), 'utf8');
    await fs.writeFile(path.join(lessonDir, 'listening.json'), JSON.stringify([{ id: `${slug}-l001`, title: { en: 'Audio', bn: 'অডিও' }, audio_url: '', transcript: [{ jp: 'おはよう。', furigana: 'おはよう。', romaji: 'Ohayou.', en: 'Good morning.', bn: 'সুপ্রভাত।' }] }], null, 2), 'utf8');
    
    console.log(`  ✅ Generated lesson ${num} (${slug})`);
  }

  await fs.writeFile(path.join(baseDir, 'index.json'), JSON.stringify({ courseId: 'minna-beginner', totalLessons: lessonMeta.length, manifests }, null, 2), 'utf8');
  console.log(`\n🎉 Success! Generated all ${lessonMeta.length} lessons in data/lessons/`);
}

generateAll().catch((err) => {
  console.error('❌ Generation failed:', err);
  process.exit(1);
});
