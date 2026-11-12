/**
 * Natural Japanese TTS Normalizer for MeloTTS & Piper-plus
 * Enforces breathing pauses and replaces ambiguous kanji readings with kana before speaking.
 */
(function (global) {
  'use strict';

  const PHONETIC_MAP = [
    [/今日/g, 'きょう'],
    [/明日/g, 'あした'],
    [/昨日/g, 'きのう'],
    [/私/g, 'わたし'],
    [/僕/g, 'ぼく'],
    [/何ですか/g, 'なんですか'],
    [/何/g, 'なに'],
    [/一日/g, 'いちにち'],
    [/一人/g, 'ひとり'],
    [/二人/g, 'ふたり'],
    [/上手/g, 'じょうず'],
    [/下手/g, 'へた'],
    [/大好き/g, 'だいすき'],
    [/大丈夫/g, 'だいじょうぶ'],
    [/本当/g, 'ほんとう'],
    [/一緒/g, 'いっしょ'],
    [/少し/g, 'すこし'],
    [/沢山/g, 'たくさん'],
    [/可愛い/g, 'かわいい'],
    [/易しい/g, 'やさしい'],
    [/難しい/g, 'むずかしい']
  ];

  function formatForJapaneseTTS(rawText) {
    if (!rawText) return '';
    let text = String(rawText)
      .replace(/<[^>]+>/g, '')         // Strip any HTML/ruby tags
      .replace(/\*\*|__|\`/g, '')     // Strip markdown symbols
      .replace(/\([^)]*\)/g, '')       // Strip parenthetical romaji/English notes
      .replace(/（[^）]*）/g, '')
      .trim();

    for (const [pattern, kana] of PHONETIC_MAP) {
      text = text.replace(pattern, kana);
    }

    // Normalize punctuation for calm, measured breathing pauses
    text = text
      .replace(/[…]+/g, '、')
      .replace(/\.\.\./g, '、')
      .replace(/！/g, '。')
      .replace(/!/g, '。')
      .replace(/？/g, '？ ')
      .replace(/\?/g, '？ ')
      .replace(/。\s*/g, '。 ')
      .replace(/、\s*/g, '、 ')
      .replace(/\s+/g, ' ')
      .trim();

    return text;
  }

  global.formatForJapaneseTTS = formatForJapaneseTTS;
})(typeof window !== 'undefined' ? window : globalThis);
