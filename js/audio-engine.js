/* js/audio-engine.js
 * Phase 6 — pure audio engine. No DOM beyond creating a detached <audio>.
 * Exposes window.AudioEngine.
 *
 * Priority: file URL → browser speech synthesis (ja-JP) → 'error' event.
 * Loop semantics: single mode replays the item; queue mode restarts the queue.
 */
(function (root) {
  'use strict';

  const KEY = { rate: 'nihongo_audio_rate', loop: 'nihongo_audio_loop' };
  const RATES = [0.75, 1, 1.25];

  const state = {
    rate: loadRate(),
    loop: loadLoop(),
    queue: null,          // { items: [], index: number }
    currentItem: null,
    isPlaying: false,
    audioEl: null,
    speakingToken: 0,
    playbackSource: null  // 'file' | 'speech'
  };

  const listeners = {};

  /* ── Events ─────────────────────────────────────── */
  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); return () => off(evt, fn); }
  function off(evt, fn) {
    const a = listeners[evt]; if (!a) return;
    const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1);
  }
  function emit(evt, detail) {
    (listeners[evt] || []).forEach(fn => {
      try { fn(detail); } catch (e) { console.error('[AudioEngine]', evt, e); }
    });
  }

  /* ── Persistence ────────────────────────────────── */
  function loadRate() {
    try { const v = parseFloat(localStorage.getItem(KEY.rate)); return RATES.includes(v) ? v : 1; }
    catch (e) { return 1; }
  }
  function loadLoop() {
    try { return localStorage.getItem(KEY.loop) === 'true'; } catch (e) { return false; }
  }
  function persistRate() { try { localStorage.setItem(KEY.rate, String(state.rate)); } catch (e) {} }
  function persistLoop() { try { localStorage.setItem(KEY.loop, String(state.loop)); } catch (e) {} }

  /* ── Audio element ──────────────────────────────── */
  function getAudioEl() {
    if (!state.audioEl) {
      const a = document.createElement('audio');
      a.preload = 'auto';
      state.audioEl = a;
    }
    return state.audioEl;
  }

  /* ── Speech ─────────────────────────────────────── */
  function ttsAvailable() {
    return 'speechSynthesis' in root && 'SpeechSynthesisUtterance' in root;
  }
  function getJaVoice() {
    if (!ttsAvailable()) return null;
    const v = root.speechSynthesis.getVoices() || [];
    return v.find(x => x.lang === 'ja-JP') ||
           v.find(x => x.lang && x.lang.indexOf('ja') === 0) || null;
  }
  if (ttsAvailable()) {
    try { root.speechSynthesis.onvoiceschanged = () => {}; } catch (e) {}
  }

  /* Strip speaker labels and placeholders before TTS. */
  function sanitize(text) {
    return String(text == null ? '' : text)
      .replace(/^[\u3000\s]*[\u3040-\u30ff\u4e00-\u9faf]{1,8}[：:]\s*/, '')
      .replace(/[_＿]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function speak(cleanText) {
    return new Promise((resolve, reject) => {
      if (!ttsAvailable()) return reject(new Error('tts-unavailable'));
      if (!cleanText) return reject(new Error('empty-text'));
      const myToken = ++state.speakingToken;
      const u = new SpeechSynthesisUtterance(cleanText);
      u.lang = 'ja-JP';
      u.rate = state.rate;
      const v = getJaVoice();
      if (v) u.voice = v;
      u.onend = () => { if (myToken === state.speakingToken) resolve(); };
      u.onerror = (e) => {
        if (myToken !== state.speakingToken) return;
        const err = (e && e.error) || 'speech-error';
        if (err === 'interrupted' || err === 'canceled') resolve();
        else reject(new Error(err));
      };
      try { root.speechSynthesis.speak(u); }
      catch (e) { reject(e); }
    });
  }

  /* ── Playback: one pass ─────────────────────────── */
  function playFileOnce(url) {
    return new Promise((resolve, reject) => {
      const a = getAudioEl();
      let settled = false;
      const finish = (fn, val) => { if (!settled) { settled = true; clearTimeout(timer); fn(val); } };

      const timer = setTimeout(() => { try { a.pause(); } catch (e) {} finish(reject, new Error('audio-timeout')); }, 4000);

      a.onerror = () => finish(reject, new Error('audio-error'));
      a.onended = () => finish(resolve);
      a.oncanplay = null;

      try {
        a.pause();
        a.removeAttribute('src');
        a.src = url;
        a.load();
        a.playbackRate = state.rate;
        a.play().then(() => {}, (e) => finish(reject, e));
      } catch (e) { finish(reject, e); }
    });
  }

  /* ── Stop (reusable) ────────────────────────────── */
  function stopPlayback() {
    state.speakingToken++;
    if (ttsAvailable()) { try { root.speechSynthesis.cancel(); } catch (e) {} }
    if (state.audioEl) {
      try {
        state.audioEl.pause();
        state.audioEl.removeAttribute('src');
        state.audioEl.load();
      } catch (e) {}
    }
    state.playbackSource = null;
  }

  /* ── Play one item through to completion (no looping) ── */
  async function playOnce(item) {
    if (item.url) {
      try {
        state.playbackSource = 'file';
        await playFileOnce(item.url);
        return;
      } catch (e) {
        console.warn('[AudioEngine] file failed, falling back to speech:', item.url, e.message);
        // fall through
      }
    }
    if (!item.text) throw new Error('no-audio-source');
    state.playbackSource = 'speech';
    await speak(sanitize(item.text));
  }

  /* ── Main play routine ──────────────────────────── */
  async function runItem(item) {
    if (!item) return;
    stopPlayback();
    state.currentItem = item;
    state.isPlaying = true;
    emit('play', { item, queue: state.queue });

    try {
      await playOnce(item);
    } catch (e) {
      if (state.currentItem !== item) return;
      state.isPlaying = false;
      emit('error', { item, reason: e.message });
      return;
    }
    if (state.currentItem !== item) return;

    // Decide what to do next
    if (state.queue) {
      const q = state.queue;
      if (q.index + 1 < q.items.length) {
        q.index++;
        emit('queuechange', { queue: q });
        runItem(q.items[q.index]);
      } else if (state.loop) {
        q.index = 0;
        emit('queuechange', { queue: q });
        runItem(q.items[0]);
      } else {
        state.isPlaying = false;
        emit('ended', { item, queueComplete: true });
      }
    } else {
      if (state.loop) {
        runItem(item);
      } else {
        state.isPlaying = false;
        emit('ended', { item });
      }
    }
  }

  /* ── Public: single / queue ─────────────────────── */
  function playSingle(item) {
    state.queue = null;
    emit('queuechange', { queue: null });
    runItem(item);
  }

  function playQueue(items, startIndex) {
    if (!items || !items.length) return;
    state.queue = { items: items.slice(), index: startIndex | 0 };
    emit('queuechange', { queue: state.queue });
    runItem(state.queue.items[state.queue.index]);
  }

  function next() {
    if (!state.queue) return;
    if (state.queue.index + 1 < state.queue.items.length) {
      state.queue.index++;
      emit('queuechange', { queue: state.queue });
      runItem(state.queue.items[state.queue.index]);
    }
  }

  function prev() {
    if (!state.queue) return;
    if (state.queue.index > 0) state.queue.index--;
    emit('queuechange', { queue: state.queue });
    runItem(state.queue.items[state.queue.index]);
  }

  function jumpTo(i) {
    if (!state.queue || i < 0 || i >= state.queue.items.length) return;
    state.queue.index = i;
    emit('queuechange', { queue: state.queue });
    runItem(state.queue.items[i]);
  }

  function stop() {
    stopPlayback();
    state.isPlaying = false;
    state.queue = null;
    state.currentItem = null;
    emit('stop', {});
    emit('queuechange', { queue: null });
  }

  function setRate(r) {
    r = parseFloat(r);
    if (!RATES.includes(r)) return;
    state.rate = r;
    persistRate();
    if (state.audioEl) state.audioEl.playbackRate = r;
    emit('ratechange', { rate: r });
  }

  function setLoop(b) {
    state.loop = !!b;
    persistLoop();
    emit('loopchange', { loop: state.loop });
  }

  root.AudioEngine = {
    on, off,
    playSingle, playQueue, stop, next, prev, jumpTo,
    setRate, setLoop, RATES,
    get rate()         { return state.rate; },
    get loop()         { return state.loop; },
    get isPlaying()    { return state.isPlaying; },
    get currentItem()  { return state.currentItem; },
    get queue()        { return state.queue; },
    get hasSpeech()    { return ttsAvailable(); },
    get hasJaVoice()   { return !!getJaVoice(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
