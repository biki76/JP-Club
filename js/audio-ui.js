/* js/audio-ui.js
 * Phase 6 — audio control bar + per-item play button helper.
 * Exposes window.AudioUI.
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  let barEl = null;

  /* ── Bar ─────────────────────────────────────────── */
  function ensureBar() {
    if (barEl) return barEl;
    barEl = document.createElement('div');
    barEl.className = 'audio-bar';
    barEl.hidden = true;
    barEl.setAttribute('role', 'region');
    barEl.setAttribute('aria-label', 'Audio player');
    barEl.innerHTML = `
      <button type="button" class="audio-bar__icon-btn audio-bar__prev" aria-label="Previous" title="Previous">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
      </button>
      <button type="button" class="audio-bar__icon-btn audio-bar__play" aria-label="Play" title="Play">
        <svg class="audio-bar__icon audio-bar__icon--play"  width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        <svg class="audio-bar__icon audio-bar__icon--pause" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" hidden><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>
      </button>
      <button type="button" class="audio-bar__icon-btn audio-bar__next" aria-label="Next" title="Next">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>
      </button>
      <div class="audio-bar__info">
        <span class="audio-bar__label"></span>
        <span class="audio-bar__counter"></span>
      </div>
      <button type="button" class="audio-bar__chip audio-bar__rate" aria-label="Playback speed" title="Speed">
        <span class="audio-bar__rate-label">1x</span>
      </button>
      <button type="button" class="audio-bar__chip audio-bar__loop" aria-pressed="false" aria-label="Loop" title="Loop">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3"/>
        </svg>
      </button>
      <button type="button" class="audio-bar__icon-btn audio-bar__close" aria-label="Close player" title="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    `;
    document.body.appendChild(barEl);
    wire(barEl);
    return barEl;
  }

  function wire(bar) {
    const play  = bar.querySelector('.audio-bar__play');
    const prevB = bar.querySelector('.audio-bar__prev');
    const nextB = bar.querySelector('.audio-bar__next');
    const rate  = bar.querySelector('.audio-bar__rate');
    const loop  = bar.querySelector('.audio-bar__loop');
    const close = bar.querySelector('.audio-bar__close');
    const iPlay  = bar.querySelector('.audio-bar__icon--play');
    const iPause = bar.querySelector('.audio-bar__icon--pause');
    const label  = bar.querySelector('.audio-bar__label');
    const counter = bar.querySelector('.audio-bar__counter');

    play.addEventListener('click', () => {
      if (AudioEngine.isPlaying) { AudioEngine.stop(); return; }
      const q = AudioEngine.queue;
      if (q && q.items[q.index]) { AudioEngine.jumpTo(q.index); return; }
      if (AudioEngine.currentItem) AudioEngine.playSingle(AudioEngine.currentItem);
    });
    prevB.addEventListener('click', () => AudioEngine.prev());
    nextB.addEventListener('click', () => AudioEngine.next());
    rate.addEventListener('click', () => {
      const i = AudioEngine.RATES.indexOf(AudioEngine.rate);
      AudioEngine.setRate(AudioEngine.RATES[(i + 1) % AudioEngine.RATES.length]);
    });
    loop.addEventListener('click', () => AudioEngine.setLoop(!AudioEngine.loop));
    close.addEventListener('click', () => { AudioEngine.stop(); });

    function reflect() {
      bar.hidden = !AudioEngine.isPlaying && !AudioEngine.queue && !AudioEngine.currentItem;
      const playing = AudioEngine.isPlaying;
      iPlay.hidden  = playing;
      iPause.hidden = !playing;
      play.setAttribute('aria-label', playing ? 'Pause' : 'Play');

      const item = AudioEngine.currentItem;
      label.textContent = item ? (item.label || item.text || '') : '';

      const q = AudioEngine.queue;
      if (q && q.items.length > 1) {
        counter.hidden = false;
        counter.textContent = `${q.index + 1} / ${q.items.length}`;
        prevB.hidden = false; nextB.hidden = false;
      } else {
        counter.hidden = true;
        prevB.hidden = true; nextB.hidden = true;
      }

      bar.querySelector('.audio-bar__rate-label').textContent = AudioEngine.rate + 'x';
      loop.setAttribute('aria-pressed', AudioEngine.loop ? 'true' : 'false');
      loop.classList.toggle('is-active', AudioEngine.loop);
    }

    AudioEngine.on('play',        reflect);
    AudioEngine.on('ended',       reflect);
    AudioEngine.on('stop',        reflect);
    AudioEngine.on('queuechange', reflect);
    AudioEngine.on('ratechange',  reflect);
    AudioEngine.on('loopchange',  reflect);
    AudioEngine.on('error', e => {
      console.warn('[AudioUI] playback error', e);
      label.textContent = 'Audio unavailable';
      setTimeout(reflect, 1200);
    });
    reflect();
  }

  /* ── Per-item play button ───────────────────────── */
  function makeButton(item, extraClass) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'audio-btn' + (extraClass ? ' ' + extraClass : '');
    btn.setAttribute('aria-label', 'Play');
    btn.title = 'Play';
    if (item.id) btn.setAttribute('data-item-id', item.id);
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`;
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      AudioEngine.playSingle(item);
    });
    return btn;
  }

  /* ── Play-all button ────────────────────────────── */
  function makePlayAll(getItems, label) {
    const wrap = document.createElement('div');
    wrap.className = 'audio-playall';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--soft btn--sm audio-playall__btn';
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
      <span>Play all</span>
    `;
    btn.addEventListener('click', () => {
      const items = getItems();
      if (!items || !items.length) return;
      AudioEngine.playQueue(items.map(i => ({ ...i, label: i.label || label })), 0);
    });
    wrap.appendChild(btn);
    return wrap;
  }

  /* ── Highlight the currently-playing item ───────── */
  function highlightCurrent(item) {
    document.querySelectorAll('.audio-btn.is-playing').forEach(b => b.classList.remove('is-playing'));
    if (item && item.id) {
      const btn = document.querySelector(`.audio-btn[data-item-id="${CSS.escape(item.id)}"]`);
      if (btn) btn.classList.add('is-playing');
    }
  }

  AudioEngine.on('play',  ({ item }) => highlightCurrent(item));
  AudioEngine.on('ended', () => highlightCurrent(null));
  AudioEngine.on('stop',  () => highlightCurrent(null));
  AudioEngine.on('error', () => highlightCurrent(null));

  window.AudioUI = { ensureBar, makeButton, makePlayAll, esc };
})();
