/* Phase 10 — placement quiz.
 * 15 questions weighted across N5 / N4 / N3. Writes
 *   localStorage['nihongo_placement_result'] = {
 *     score, max, percent, recommendedLesson,
 *     byTier: { n5:{c,t}, n4:{c,t}, n3:{c,t} },
 *     completedAt: Date.now()
 *   }
 * No earlier-phase keys touched.
 */
(function () {
  'use strict';

  var QUESTIONS = [
    // ---- N5 (weight 1) ----
    {
      tier: 'n5', weight: 1,
      prompt: { en: 'What does this word mean?', bn: 'এই শব্দটির অর্থ কী?' },
      stem: { jp: '水', furigana: 'みず' },
      options: [
        { en: 'fire',  bn: 'আগুন' },
        { en: 'water', bn: 'পানি' },
        { en: 'earth', bn: 'মাটি' },
        { en: 'wind',  bn: 'বাতাস' }
      ],
      correct: 1
    },
    {
      tier: 'n5', weight: 1,
      prompt: { en: 'What does this word mean?', bn: 'এই শব্দটির অর্থ কী?' },
      stem: { jp: '食べる', furigana: 'たべる' },
      options: [
        { en: 'to drink', bn: 'পান করা' },
        { en: 'to eat',   bn: 'খাওয়া' },
        { en: 'to sleep', bn: 'ঘুমানো' },
        { en: 'to run',   bn: 'দৌড়ানো' }
      ],
      correct: 1
    },
    {
      tier: 'n5', weight: 1,
      prompt: { en: 'What does this word mean?', bn: 'এই শব্দটির অর্থ কী?' },
      stem: { jp: '大きい', furigana: 'おおきい' },
      options: [
        { en: 'small', bn: 'ছোট' },
        { en: 'big',   bn: 'বড়' },
        { en: 'new',   bn: 'নতুন' },
        { en: 'old',   bn: 'পুরনো' }
      ],
      correct: 1
    },
    {
      tier: 'n5', weight: 1,
      prompt: { en: 'What does this word mean?', bn: 'এই শব্দটির অর্থ কী?' },
      stem: { jp: '学校', furigana: 'がっこう' },
      options: [
        { en: 'hospital', bn: 'হাসপাতাল' },
        { en: 'station',  bn: 'স্টেশন' },
        { en: 'school',   bn: 'বিদ্যালয়' },
        { en: 'park',     bn: 'পার্ক' }
      ],
      correct: 2
    },
    {
      tier: 'n5', weight: 1,
      prompt: { en: 'What does this word mean?', bn: 'এই শব্দটির অর্থ কী?' },
      stem: { jp: '行く', furigana: 'いく' },
      options: [
        { en: 'to come',   bn: 'আসা' },
        { en: 'to go',     bn: 'যাওয়া' },
        { en: 'to return', bn: 'ফেরা' },
        { en: 'to stay',   bn: 'থাকা' }
      ],
      correct: 1
    },

    // ---- N4 (weight 2) ----
    {
      tier: 'n4', weight: 2,
      prompt: { en: 'What does this word mean?', bn: 'এই শব্দটির অর্থ কী?' },
      stem: { jp: '便利', furigana: 'べんり' },
      options: [
        { en: 'difficult',  bn: 'কঠিন' },
        { en: 'convenient', bn: 'সুবিধাজনক' },
        { en: 'expensive',  bn: 'ব্যয়বহুল' },
        { en: 'busy',       bn: 'ব্যস্ত' }
      ],
      correct: 1
    },
    {
      tier: 'n4', weight: 2,
      prompt: { en: 'What does this word mean?', bn: 'এই শব্দটির অর্থ কী?' },
      stem: { jp: '予約する', furigana: 'よやくする' },
      options: [
        { en: 'to reserve', bn: 'সংরক্ষণ করা' },
        { en: 'to cancel',  bn: 'বাতিল করা' },
        { en: 'to buy',     bn: 'কেনা' },
        { en: 'to return',  bn: 'ফেরানো' }
      ],
      correct: 0
    },
    {
      tier: 'n4', weight: 2,
      prompt: { en: 'What does this word mean?', bn: 'এই শব্দটির অর্থ কী?' },
      stem: { jp: '説明', furigana: 'せつめい' },
      options: [
        { en: 'decision',    bn: 'সিদ্ধান্ত' },
        { en: 'explanation', bn: 'ব্যাখ্যা' },
        { en: 'question',    bn: 'প্রশ্ন' },
        { en: 'answer',      bn: 'উত্তর' }
      ],
      correct: 1
    },
    {
      tier: 'n4', weight: 2,
      prompt: { en: 'What does this word mean?', bn: 'এই শব্দটির অর্থ কী?' },
      stem: { jp: '準備', furigana: 'じゅんび' },
      options: [
        { en: 'preparation', bn: 'প্রস্তুতি' },
        { en: 'cleaning',    bn: 'পরিষ্কার' },
        { en: 'meeting',     bn: 'সভা' },
        { en: 'travel',      bn: 'ভ্রমণ' }
      ],
      correct: 0
    },
    {
      tier: 'n4', weight: 2,
      prompt: { en: 'What does this word mean?', bn: 'এই শব্দটির অর্থ কী?' },
      stem: { jp: '経験', furigana: 'けいけん' },
      options: [
        { en: 'experience', bn: 'অভিজ্ঞতা' },
        { en: 'opinion',    bn: 'মতামত' },
        { en: 'exercise',   bn: 'ব্যায়াম' },
        { en: 'education',  bn: 'শিক্ষা' }
      ],
      correct: 0
    },

    // ---- N3 (weight 3) ----
    {
      tier: 'n3', weight: 3,
      prompt: { en: 'What does this word mean?', bn: 'এই শব্দটির অর্থ কী?' },
      stem: { jp: '具体的', furigana: 'ぐたいてき' },
      options: [
        { en: 'abstract',           bn: 'বিমূর্ত' },
        { en: 'concrete / specific', bn: 'নির্দিষ্ট' },
        { en: 'dangerous',          bn: 'বিপজ্জনক' },
        { en: 'possible',           bn: 'সম্ভব' }
      ],
      correct: 1
    },
    {
      tier: 'n3', weight: 3,
      prompt: { en: 'What does this word mean?', bn: 'এই শব্দটির অর্থ কী?' },
      stem: { jp: '支払う', furigana: 'しはらう' },
      options: [
        { en: 'to save',   bn: 'সঞ্চয় করা' },
        { en: 'to borrow', bn: 'ধার করা' },
        { en: 'to pay',    bn: 'পরিশোধ করা' },
        { en: 'to lend',   bn: 'ধার দেওয়া' }
      ],
      correct: 2
    },
    {
      tier: 'n3', weight: 3,
      prompt: { en: 'What does this word mean?', bn: 'এই শব্দটির অর্থ কী?' },
      stem: { jp: '増える', furigana: 'ふえる' },
      options: [
        { en: 'to decrease',  bn: 'কমানো' },
        { en: 'to increase',  bn: 'বাড়া' },
        { en: 'to remain',    bn: 'থাকা' },
        { en: 'to disappear', bn: 'অদৃশ্য হওয়া' }
      ],
      correct: 1
    },
    {
      tier: 'n3', weight: 3,
      prompt: { en: 'What does this word mean?', bn: 'এই শব্দটির অর্থ কী?' },
      stem: { jp: '断る', furigana: 'ことわる' },
      options: [
        { en: 'to accept', bn: 'গ্রহণ করা' },
        { en: 'to refuse', bn: 'প্রত্যাখ্যান করা' },
        { en: 'to agree',  bn: 'সম্মত হওয়া' },
        { en: 'to forget', bn: 'ভুলে যাওয়া' }
      ],
      correct: 1
    },
    {
      tier: 'n3', weight: 3,
      prompt: { en: 'What does this word mean?', bn: 'এই শব্দটির অর্থ কী?' },
      stem: { jp: '我慢する', furigana: 'がまんする' },
      options: [
        { en: 'to endure', bn: 'সহ্য করা' },
        { en: 'to hurry',  bn: 'তাড়াহুড়া করা' },
        { en: 'to relax',  bn: 'বিশ্রাম নেওয়া' },
        { en: 'to decide', bn: 'সিদ্ধান্ত নেওয়া' }
      ],
      correct: 0
    }
  ];

  var ROADMAP = [
    { id: 'foundations', range: [1, 10],
      label: { en: 'Foundations · N5', bn: 'ভিত্তি · N5' },
      desc:  { en: 'Hiragana, katakana, ~300 words, ~100 kanji, basic sentence patterns.',
               bn: 'হিরাগানা, কাতাকানা, ~৩০০ শব্দ, ~১০০ কাঞ্জি, প্রাথমিক বাক্য গঠন।' } },
    { id: 'building', range: [11, 25],
      label: { en: 'Building · N4', bn: 'নির্মাণ · N4' },
      desc:  { en: 'Verb forms, conditionals, ~800 words, ~300 kanji.',
               bn: 'ক্রিয়ার রূপ, শর্তসাপেক্ষ, ~৮০০ শব্দ, ~৩০০ কাঞ্জি।' } },
    { id: 'fluency', range: [26, 50],
      label: { en: 'Fluency · N3', bn: 'সাবলীলতা · N3' },
      desc:  { en: 'Keigo, complex sentences, ~1500 words, ~650 kanji.',
               bn: 'কেইগো, জটিল বাক্য, ~১৫০০ শব্দ, ~৬৫০ কাঞ্জি।' } }
  ];

  var state = { idx: 0, answers: [] };

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function txt(en, bn) {
    return '<span data-en="' + esc(en) + '" data-bn="' + esc(bn) + '">' + esc(en) + '</span>';
  }
  function ruby(base, furi) {
    if (!base) return esc(furi || '');
    if (!furi) return esc(base);
    return '<ruby>' + esc(base) + '<rt>' + esc(furi) + '</rt></ruby>';
  }
  function stage() { return document.getElementById('placement-stage'); }

  function maxScore() {
    return QUESTIONS.reduce(function (s, q) { return s + q.weight; }, 0);
  }

  function recommendLesson(score) {
    if (score <= 5)  return { lesson: 1,  band: 'foundations' };
    if (score <= 10) return { lesson: 8,  band: 'foundations' };
    if (score <= 15) return { lesson: 15, band: 'building' };
    if (score <= 20) return { lesson: 22, band: 'building' };
    if (score <= 25) return { lesson: 30, band: 'fluency' };
    return               { lesson: 38, band: 'fluency' };
  }

  // ---------- intro ----------
  function renderIntro() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem('nihongo_placement_result') || 'null'); } catch (e) {}

    var html = '<div class="placement-intro">';
    html += '<h1 class="placement-intro__title">' + txt('Find your starting point', 'আপনার শুরুর পয়েন্ট খুঁজুন') + '</h1>';
    html += '<p class="placement-intro__lead">' + txt(
      "Fifteen short questions across N5–N3. We'll recommend the lesson to start from and lay out your roadmap.",
      '১৫টি সংক্ষিপ্ত প্রশ্ন N5–N3 জুড়ে। আমরা সুপারিশ করব কোন পাঠ থেকে শুরু করবেন এবং আপনার রোডম্যাপ তৈরি করব।'
    ) + '</p>';
    html += '<ul class="placement-intro__list">' +
      '<li>' + txt('No timer, no pressure', 'কোনও টাইমার নেই, চাপ নেই') + '</li>' +
      '<li>' + txt('About 3 minutes', 'প্রায় ৩ মিনিট') + '</li>' +
      '<li>' + txt('Results saved locally', 'ফলাফল স্থানীয়ভাবে সংরক্ষিত') + '</li>' +
    '</ul>';
    html += '<div class="placement-intro__actions">';
    html += '<button class="btn btn--primary btn--lg" id="placement-start">' + txt('Begin placement', 'প্লেসমেন্ট শুরু করুন') + '</button>';
    if (saved) {
      html += '<button class="btn btn--ghost btn--lg" id="placement-view-last">' + txt('View last result', 'সর্বশেষ ফলাফল দেখুন') + '</button>';
    }
    html += '</div>';
    if (saved) {
      html += '<p class="placement-intro__last">' + txt(
        'Last attempt: ' + saved.score + '/' + saved.max + ' · recommended Lesson ' + saved.recommendedLesson,
        'সর্বশেষ প্রচেষ্টা: ' + saved.score + '/' + saved.max + ' · প্রস্তাবিত পাঠ ' + saved.recommendedLesson
      ) + '</p>';
    }
    html += '</div>';
    stage().innerHTML = html;

    document.getElementById('placement-start').addEventListener('click', function () {
      state = { idx: 0, answers: [] };
      renderQuestion();
    });
    var v = document.getElementById('placement-view-last');
    if (v) {
      v.addEventListener('click', function () {
        renderSavedResult(saved);
      });
    }
  }

  // ---------- question ----------
  function renderQuestion() {
    var q = QUESTIONS[state.idx];
    var pct = Math.round((state.idx / QUESTIONS.length) * 100);

    var html = '<div class="placement-progress">';
    html += '<div class="progress"><div class="progress__bar" style="width:' + pct + '%"></div></div>';
    html += '<span class="placement-progress__label">' +
      txt('Question ' + (state.idx + 1) + ' of ' + QUESTIONS.length,
          'প্রশ্ন ' + (state.idx + 1) + ' / ' + QUESTIONS.length) +
      '</span></div>';

    html += '<div class="placement-card">';
    html += '<div class="placement-card__tier"><span class="badge badge--outline">' + q.tier.toUpperCase() + '</span></div>';
    html += '<p class="placement-card__prompt">' + txt(q.prompt.en, q.prompt.bn) + '</p>';
    html += '<div class="placement-card__stem">' + ruby(q.stem.jp, q.stem.furigana) + '</div>';
    html += '<div class="placement-options">';
    q.options.forEach(function (opt, i) {
      html += '<button class="placement-option" type="button" data-idx="' + i + '">';
      html += '<span class="placement-option__letter" aria-hidden="true">' + String.fromCharCode(65 + i) + '</span>';
      html += '<span class="placement-option__text">' + txt(opt.en, opt.bn) + '</span>';
      html += '</button>';
    });
    html += '</div></div>';
    stage().innerHTML = html;

    Array.prototype.forEach.call(stage().querySelectorAll('.placement-option'), function (btn) {
      btn.addEventListener('click', function () {
        selectAnswer(parseInt(btn.getAttribute('data-idx'), 10));
      });
    });
  }

  function selectAnswer(idx) {
    var q = QUESTIONS[state.idx];
    var correct = idx === q.correct;
    state.answers.push({ idx: state.idx, choice: idx, correct: correct });

    var btns = stage().querySelectorAll('.placement-option');
    Array.prototype.forEach.call(btns, function (b, i) {
      b.disabled = true;
      if (i === q.correct) b.classList.add('is-correct');
      else if (i === idx) b.classList.add('is-wrong');
    });

    setTimeout(function () {
      state.idx++;
      if (state.idx >= QUESTIONS.length) finishQuiz();
      else renderQuestion();
    }, 720);
  }

  // ---------- finish ----------
  function finishQuiz() {
    var score = 0, max = 0;
    var byTier = { n5: { c: 0, t: 0 }, n4: { c: 0, t: 0 }, n3: { c: 0, t: 0 } };

    QUESTIONS.forEach(function (q, i) {
      max += q.weight;
      byTier[q.tier].t++;
      var a = state.answers[i];
      if (a && a.correct) {
        score += q.weight;
        byTier[q.tier].c++;
      }
    });

    var percent = max ? Math.round((score / max) * 100) : 0;
    var rec = recommendLesson(score);

    try {
      localStorage.setItem('nihongo_placement_result', JSON.stringify({
        score: score, max: max, percent: percent,
        recommendedLesson: rec.lesson,
        byTier: byTier,
        completedAt: Date.now()
      }));
    } catch (e) {}

    renderResult(score, max, percent, rec, byTier);
  }

  function renderSavedResult(saved) {
    if (!saved) { renderIntro(); return; }
    var rec = recommendLesson(saved.score);
    var byTier = saved.byTier || { n5: { c: 0, t: 5 }, n4: { c: 0, t: 5 }, n3: { c: 0, t: 5 } };
    renderResult(saved.score, saved.max, saved.percent, rec, byTier);
  }

  // ---------- result ----------
  function renderResult(score, max, percent, rec, byTier) {
    var R = 44;
    var C = 2 * Math.PI * R;
    var dash = C * (percent / 100);

    var html = '<div class="placement-result">';

    // score ring
    html += '<div class="placement-score">';
    html += '<svg class="placement-score__ring" viewBox="0 0 100 100" aria-hidden="true">';
    html += '<circle cx="50" cy="50" r="' + R + '" fill="none" stroke="var(--border)" stroke-width="8"/>';
    html += '<circle cx="50" cy="50" r="' + R + '" fill="none" stroke="var(--primary)" stroke-width="8" ' +
            'stroke-dasharray="' + dash + ' ' + C + '" transform="rotate(-90 50 50)" stroke-linecap="round"/>';
    html += '</svg>';
    html += '<div class="placement-score__pct">' + percent + '%</div>';
    html += '</div>';

    html += '<p class="placement-result__score-label">' +
      txt(score + ' / ' + max + ' points', score + ' / ' + max + ' পয়েন্ট') +
      '</p>';

    // tier breakdown
    html += '<div class="tier-grid">';
    ['n5', 'n4', 'n3'].forEach(function (tier) {
      var r = byTier[tier] || { c: 0, t: 0 };
      html += '<div class="tier-card">';
      html += '<div class="tier-card__level">' + tier.toUpperCase() + '</div>';
      html += '<div class="tier-card__score">' + r.c + ' / ' + r.t + '</div>';
      html += '</div>';
    });
    html += '</div>';

    // recommendation
    html += '<div class="placement-recommend">';
    html += '<div class="placement-recommend__badge">' +
      txt('Recommended starting point', 'প্রস্তাবিত শুরুর পয়েন্ট') +
      '</div>';
    html += '<h2 class="placement-recommend__title">' +
      txt('Lesson ' + rec.lesson, 'পাঠ ' + rec.lesson) +
      '</h2>';
    html += '<p class="placement-recommend__desc">' +
      txt('Based on your answers, start here and work forward.',
          'আপনার উত্তরের ভিত্তিতে, এখান থেকে শুরু করুন এবং এগিয়ে যান।') +
      '</p>';
    html += '<div class="placement-recommend__actions">';
    html += '<a class="btn btn--primary" href="lesson.html?lesson=minna-' +
      String(rec.lesson).padStart(3, '0') + '">' +
      txt('Start Lesson ' + rec.lesson + ' →', 'পাঠ ' + rec.lesson + ' শুরু করুন →') +
      '</a>';
    html += '<button class="btn btn--secondary" id="placement-retake">' +
      txt('Retake', 'আবার দিন') +
      '</button>';
    html += '</div></div>';

    // roadmap
    html += '<h2 class="roadmap__title">' + txt('Your roadmap', 'আপনার রোডম্যাপ') + '</h2>';
    html += '<div class="roadmap">';
    ROADMAP.forEach(function (phase, i) {
      var isCurrent = rec.band === phase.id;
      html += '<div class="roadmap-phase' + (isCurrent ? ' roadmap-phase--current' : '') + '">';
      html += '<div class="roadmap-phase__marker" aria-hidden="true">' + (i + 1) + '</div>';
      html += '<div class="roadmap-phase__body">';
      html += '<div class="roadmap-phase__label">' + txt(phase.label.en, phase.label.bn) + '</div>';
      html += '<div class="roadmap-phase__range">' +
        txt('Lessons ' + phase.range[0] + '–' + phase.range[1],
            'পাঠ ' + phase.range[0] + '–' + phase.range[1]) +
        '</div>';
      html += '<div class="roadmap-phase__desc">' + txt(phase.desc.en, phase.desc.bn) + '</div>';
      if (isCurrent) {
        html += '<div class="roadmap-phase__tag">' + txt('Start here', 'এখান থেকে শুরু') + '</div>';
      }
      html += '</div></div>';
    });
    html += '</div>';

    html += '</div>';
    stage().innerHTML = html;

    var retake = document.getElementById('placement-retake');
    if (retake) {
      retake.addEventListener('click', function () {
        state = { idx: 0, answers: [] };
        renderIntro();
      });
    }
  }

  // ---------- init ----------
  function init() {
    renderIntro();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
