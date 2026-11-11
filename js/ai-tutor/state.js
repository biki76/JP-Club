/* js/ai-tutor/state.js — one small store for the tutor widget.
 *
 * status: 'idle' | 'sending' | 'streaming' | 'error' | 'offline'
 * Everything that changes the UI goes through AITutorState.set(); components subscribe.
 */
(function () {
  'use strict';

  var PREFS_KEY = 'ai_tutor_prefs';       // local only (not in CloudSync's key list)
  var LEVELS = ['N5', 'N4', 'N3'];
  var MODES = ['chat', 'roleplay', 'correct', 'explain'];
  var TOPICS = ['free', 'intro', 'hobby', 'food', 'daily', 'weather', 'shop', 'travel', 'interview'];

  function readPrefs() {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function writePrefs(p) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch (e) {}
  }
  function pick(list, v, fb) { return list.indexOf(v) > -1 ? v : fb; }

  var saved = readPrefs();
  var state = {
    status: 'idle',
    level: pick(LEVELS, saved.level, 'N5'),
    mode: pick(MODES, saved.mode, 'chat'),
    topic: pick(TOPICS, saved.topic, 'free'),
    lesson: null,            // set by the host page: AITutorState.set({ lesson: 12, patterns: [...] })
    patterns: [],
    sessionId: null,
    pending: null,           // { message } — last message that has not completed (for Retry)
    error: null              // { code, message, retryable, partial }
  };
  var subs = [];

  function snapshot() { return Object.assign({}, state); }

  function set(patch) {
    var prev = snapshot();
    Object.keys(patch).forEach(function (k) { state[k] = patch[k]; });
    if ('level' in patch || 'mode' in patch || 'topic' in patch) {
      writePrefs({ level: state.level, mode: state.mode, topic: state.topic });
    }
    var next = snapshot();
    subs.slice().forEach(function (fn) { try { fn(next, prev); } catch (e) { console.error(e); } });
  }

  window.AITutorState = {
    get: snapshot,
    set: set,
    subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },
    isBusy: function () { return state.status === 'sending' || state.status === 'streaming'; },
    LEVELS: LEVELS, MODES: MODES, TOPICS: TOPICS
  };
})();
