/* js/store.js — typed localStorage façade.
 * Additive. Existing pages keep using localStorage directly; new code (and
 * gradual migrations) should route through this module.
 *
 * Design constraints honoured:
 *   - Uses localStorage directly (cloud.js's setItem interceptor still fires)
 *   - No key renames — every key string is the current one
 *   - Every get returns a default rather than throwing on corrupt JSON
 *   - Size/quota failures are swallowed and logged, never crash the page
 */
(function (root) {
  'use strict';

  const VERSION = 1;
  const VERSION_KEY = 'nihongo_store_version';

  const KEYS = {
    theme:           'nihongo_theme',
    lang:            'nihongo_lang',
    furigana:        'nihongo_furigana',
    progress:        'nihongo_progress',
    bookmarks:       'nihongo_bookmarks',
    streak:          'nihongo_streak',
    quizAttempts:    'nihongo_quiz_attempts',
    kanjiMastery:    'nihongo_kanji_mastery',
    vocabMastery:    'nihongo_vocab_mastery',
    placementResult: 'nihongo_placement_result',
    searchHistory:   'nihongo_search_history',
    lessonSection:   'nihongo_lesson_section'
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      try { return JSON.parse(raw); }
      catch { return raw; }
    } catch (e) { return fallback; }
  }

  function write(key, value) {
    try {
      const payload = (value === null || value === undefined)
        ? ''
        : (typeof value === 'string' ? value : JSON.stringify(value));
      localStorage.setItem(key, payload);
      return true;
    } catch (err) {
      if (root.console && console.warn) console.warn('[store] write failed', key, err);
      return false;
    }
  }

  function remove(key) {
    try { localStorage.removeItem(key); return true; }
    catch (e) { return false; }
  }

  /* Per-lesson section resume. Shape:
   *   { "minna-012": { tab: "grammar", updatedAt: 1698... } }
   */
  function getLessonSection(slug) {
    const map = read(KEYS.lessonSection, {}) || {};
    return (map[slug] && typeof map[slug] === 'object') ? map[slug] : null;
  }
  function setLessonSection(slug, patch) {
    if (!slug) return false;
    const map = read(KEYS.lessonSection, {}) || {};
    map[slug] = Object.assign({}, map[slug] || {}, patch, { updatedAt: Date.now() });
    return write(KEYS.lessonSection, map);
  }

  function migrate() {
    let v = Number(read(VERSION_KEY, 0)) || 0;
    if (v === VERSION) return;
    v = VERSION;
    write(VERSION_KEY, String(v));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', migrate, { once: true });
  } else {
    migrate();
  }

  root.Store = {
    VERSION,
    KEYS,
    get: read,
    set: write,
    remove,
    getLessonSection,
    setLessonSection
  };
})(window);
