/* js/srs.js
 * Phase 7 — SM-2-style scheduler + localStorage store.
 * Pure: no DOM. Exposes window.SRS.
 *
 * Cards:    nihongo_srs_cards   → { "<slug>:<id>": CardState }
 * Log:      nihongo_srs_log     → { "YYYY-MM-DD": { again, hard, good, easy, total, newIntroduced } }
 * Prefs:    nihongo_srs_prefs   → { front, newPerDay, lastLesson }
 * Meta:     nihongo_srs_meta    → { totalReviews, streakCurrent, streakLongest, streakLastDay }
 */
(function (root) {
  'use strict';

  const KEY = {
    cards: 'nihongo_srs_cards',
    log:   'nihongo_srs_log',
    prefs: 'nihongo_srs_prefs',
    meta:  'nihongo_srs_meta'
  };

  const GRADES      = ['again', 'hard', 'good', 'easy'];
  const DAY_MS      = 24 * 60 * 60 * 1000;
  const MIN_EASE    = 1.3;
  const MAX_EASE    = 2.8;
  const DEFAULT_EASE = 2.5;
  const AGAIN_DELAY_MS = 60 * 1000;

  /* ── Pure scheduling ────────────────────────────── */
  function newCardState(now) {
    return {
      ease: DEFAULT_EASE,
      interval: 0,
      reps: 0,
      lapses: 0,
      due: now || Date.now(),
      lastReview: 0,
      lastGrade: null
    };
  }

  function clampEase(e) { return Math.max(MIN_EASE, Math.min(MAX_EASE, e)); }

  function schedule(card, grade, now) {
    now = now || Date.now();
    const c = Object.assign({}, card);
    if (!c.ease) c.ease = DEFAULT_EASE;
    if (c.interval == null) c.interval = 0;
    if (c.reps == null) c.reps = 0;
    if (c.lapses == null) c.lapses = 0;

    const isNew = c.reps === 0 || c.interval === 0;

    if (grade === 'again') {
      c.lapses += 1;
      c.reps = 0;
      c.interval = 0;
      c.ease = clampEase(c.ease - 0.2);
      c.due = now + AGAIN_DELAY_MS;
    } else if (grade === 'hard') {
      c.reps += 1;
      c.interval = isNew ? 1 : Math.max(1, Math.round(c.interval * 1.2));
      c.ease = clampEase(c.ease - 0.15);
      c.due = now + c.interval * DAY_MS;
    } else if (grade === 'good') {
      c.reps += 1;
      c.interval = isNew ? 1 : Math.max(1, Math.round(c.interval * c.ease));
      c.due = now + c.interval * DAY_MS;
    } else if (grade === 'easy') {
      c.reps += 1;
      c.interval = isNew ? 4 : Math.max(1, Math.round(c.interval * c.ease * 1.3));
      c.ease = clampEase(c.ease + 0.15);
      c.due = now + c.interval * DAY_MS;
    } else {
      throw new Error('unknown grade: ' + grade);
    }

    c.lastReview = now;
    c.lastGrade = grade;
    return c;
  }

  function isDue(card, now) { return !card || card.due <= (now || Date.now()); }
  function isNew(card)      { return !card || card.reps === 0; }

  function classify(card) {
    if (!card || card.reps === 0) return 'learning';
    return card.interval < 21 ? 'young' : 'mature';
  }

  function preview(card, now) {
    now = now || Date.now();
    const out = {};
    GRADES.forEach(g => {
      const c = schedule(card, g, now);
      out[g] = { label: humanizeInterval(c.due - now), interval: c.interval };
    });
    return out;
  }

  function humanizeInterval(ms) {
    if (ms < 60 * 1000) return '<1m';
    if (ms < 60 * 60 * 1000) return Math.round(ms / 60000) + 'm';
    if (ms < DAY_MS) return Math.round(ms / 3600000) + 'h';
    const d = Math.round(ms / DAY_MS);
    if (d < 30) return d + 'd';
    if (d < 365) return Math.round(d / 30) + 'mo';
    return Math.round(d / 365) + 'y';
  }

  /* ── Storage ────────────────────────────────────── */
  function readJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  function writeJSON(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); return true; }
    catch (e) { return false; }
  }

  function loadCards()  { return readJSON(KEY.cards, {}) || {}; }
  function saveCards(c) { return writeJSON(KEY.cards, c || {}); }
  function loadLog()    { return readJSON(KEY.log, {}) || {}; }
  function saveLog(l)   { return writeJSON(KEY.log, l || {}); }
  function loadMeta() {
    return Object.assign(
      { totalReviews: 0, streakCurrent: 0, streakLongest: 0, streakLastDay: null },
      readJSON(KEY.meta, {}) || {}
    );
  }
  function saveMeta(m)  { return writeJSON(KEY.meta, m || {}); }
  function loadPrefs() {
    return Object.assign(
      { front: 'jp', newPerDay: 20, lastLesson: 'all' },
      readJSON(KEY.prefs, {}) || {}
    );
  }
  function savePrefs(p) { return writeJSON(KEY.prefs, p || {}); }

  /* ── Date / streak helpers ──────────────────────── */
  function todayKey(ts) {
    const d = new Date(ts || Date.now());
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }
  function startOfDay(ts) {
    const d = new Date(ts || Date.now());
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  function yesterdayKey(ts) {
    const d = new Date(ts || Date.now());
    d.setDate(d.getDate() - 1);
    return todayKey(d.getTime());
  }

  function updateStreak(meta, todayK) {
    if (!meta.streakLastDay) {
      meta.streakCurrent = 1;
      meta.streakLongest = Math.max(meta.streakLongest || 0, 1);
    } else if (meta.streakLastDay === todayK) {
      /* already counted today */
    } else if (meta.streakLastDay === yesterdayKey()) {
      meta.streakCurrent = (meta.streakCurrent || 0) + 1;
      meta.streakLongest = Math.max(meta.streakLongest || 0, meta.streakCurrent);
    } else {
      meta.streakCurrent = 1;
      meta.streakLongest = Math.max(meta.streakLongest || 0, 1);
    }
    meta.streakLastDay = todayK;
  }

  root.SRS = {
    GRADES, DAY_MS,
    newCardState, schedule, isDue, isNew, classify, preview, humanizeInterval,
    loadCards, saveCards, loadLog, saveLog, loadMeta, saveMeta, loadPrefs, savePrefs,
    todayKey, startOfDay, yesterdayKey, updateStreak,
    KEY
  };
})(typeof window !== 'undefined' ? window : globalThis);
