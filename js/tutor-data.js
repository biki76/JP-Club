/* Moon · Speaking Partner — content only (no logic).
   Edit this file to add topics, phrases, tips or natural voices. */
window.TUTOR_DATA = {
  /* Natural (server) voices shown in the Voice menu.
     id must match a key in supabase/functions/voice-speak (female, female2, male, male2).
     MeloTTS has one voice; if you move to Azure add:
     { id: 'male', label: 'Male - Keita' }, { id: 'female2', label: 'Female - Shiori' } */
  naturalVoices: [
    { id: 'female', label: 'Natural - Moon' }
  ],

  topics: {
    free: {
      en: 'Free talk', bn: 'ফ্রি আলাপ',
      phrases: [
        { jp: 'そうですか', en: 'I see' },
        { jp: 'もう一度お願いします', en: 'Once more, please' },
        { jp: 'ゆっくりお願いします', en: 'Slowly, please' }
      ]
    },
    intro: {
      en: 'Self-introduction', bn: 'নিজের পরিচয়',
      phrases: [
        { jp: 'はじめまして。〇〇です', say: 'はじめまして。ムーンです', en: 'Nice to meet you. I am ...' },
        { jp: '〇〇から来ました', say: 'バングラデシュから来ました', en: 'I came from ...' },
        { jp: '学生です', en: 'I am a student' },
        { jp: 'どうぞよろしくお願いします', en: 'Pleased to meet you' }
      ]
    },
    hobby: {
      en: 'Hobbies', bn: 'শখ',
      phrases: [
        { jp: '映画が好きです', en: 'I like movies' },
        { jp: '週末はサッカーをします', en: 'On weekends I play soccer' },
        { jp: 'アニメを見ます', en: 'I watch anime' },
        { jp: '楽しいです', en: 'It is fun' }
      ]
    },
    food: {
      en: 'Food', bn: 'খাবার',
      phrases: [
        { jp: 'これは何ですか', en: 'What is this?' },
        { jp: 'これをお願いします', en: 'This one, please' },
        { jp: 'おいしいです', en: 'It is delicious' },
        { jp: 'すごいですね', en: 'Wow, amazing' }
      ]
    },
    daily: {
      en: 'Daily needs', bn: 'দৈনন্দিন প্রয়োজন',
      phrases: [
        { jp: 'いくらですか', en: 'How much is it?' },
        { jp: 'トイレはどこですか', en: 'Where is the toilet?' },
        { jp: 'すみません、〇〇をお願いします', say: 'すみません、水をお願いします', en: 'Excuse me, ... please' }
      ]
    },
    weather: {
      en: 'Weather', bn: 'আবহাওয়া',
      phrases: [
        { jp: '暑いですね', en: 'It is hot, isn\'t it?' },
        { jp: '雨ですね', en: 'It is raining, isn\'t it?' },
        { jp: 'いい天気ですね', en: 'Nice weather, isn\'t it?' }
      ]
    },
    interview: {
      en: 'Part-time interview', bn: 'পার্ট-টাইম ইন্টারভিউ',
      phrases: [
        { jp: '失礼します', en: 'Excuse me (entering the room)' },
        { jp: '〇〇と申します', say: 'ムーンと申します', en: 'My name is ...' },
        { jp: '学生ビザです', en: 'I have a student visa' },
        { jp: '月曜日と水曜日に働けます', en: 'I can work on Monday and Wednesday' },
        { jp: '電車で三十分です', en: 'It takes 30 minutes by train' },
        { jp: '経験があります', en: 'I have experience' },
        { jp: '頑張ります', en: 'I will do my best' }
      ]
    }
  },

  tips: [
    { en: 'Always use polite forms: です and ます.' },
    { en: 'Show you are listening: はい, そうですか, へえー.' },
    { en: 'Speak loudly and clearly. Energy (元気) matters more than perfect grammar.' },
    { en: 'If you do not understand, say もう一度お願いします (once more, please).' }
  ]
};
