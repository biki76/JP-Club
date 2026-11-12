/* js/tutor-piper.js — free, in-browser Japanese voice (Piper via the `piper-plus` package).
 * No server, no account, no paid API. The voice model is downloaded once from HuggingFace
 * and cached by the library.
 *
 * Exposes window.TutorPiper:
 *   speak(text, rate) → Promise<HTMLAudioElement>   (rejects if the engine cannot run here)
 *   voices → [{ id, label }]
 *
 * The library and onnxruntime versions are pinned in the importmap written by tools/add-piper.mjs.
 * If the import fails (offline, blocked by CSP, not configured), speak() rejects and the caller
 * falls back to the device voice.
 */
(function () {
  'use strict';

  var VOICES = [
    { id: 'tsukuyomi', label: 'Tsukuyomi (Piper, free)' }
  ];
  var modPromise = null;
  var initPromise = null;

  function loadModule() {
    if (!modPromise) {
      modPromise = import('piper-plus').catch(function (e) {
        modPromise = null;                              // allow a retry on the next tap
        throw new Error('piper module not available: ' + (e && e.message));
      });
    }
    return modPromise;
  }

  function getEngine() {
    if (!initPromise) {
      initPromise = loadModule().then(function (m) {
        var P = m.PiperPlus || (m.default && m.default.PiperPlus) || m.default;
        if (!P || typeof P.initialize !== 'function') throw new Error('piper API changed');
        return P.initialize(VOICES[0].id);
      }).catch(function (e) {
        initPromise = null;                             // retry later instead of caching the failure
        throw e;
      });
    }
    return initPromise;
  }

  /* Turn whatever synthesize() returns into a playable <audio> element. */
  function toAudio(out, rate) {
    var src = null;
    if (out instanceof HTMLAudioElement) return out;
    if (out instanceof Blob) src = URL.createObjectURL(out);
    else if (out instanceof ArrayBuffer || ArrayBuffer.isView(out)) {
      src = URL.createObjectURL(new Blob([out], { type: 'audio/wav' }));
    } else if (out && typeof out.url === 'string') src = out.url;
    if (!src) throw new Error('unsupported piper output');
    var a = new Audio(src);
    a.playbackRate = Math.min(1.25, Math.max(0.7, rate || 1));
    if (src.indexOf('blob:') === 0) a.addEventListener('ended', function () { URL.revokeObjectURL(src); }, { once: true });
    return a;
  }

  function speak(text, rate) {
    text = String(text || '').trim();
    if (!text) return Promise.reject(new Error('empty text'));
    return getEngine().then(function (piper) {
      return piper.synthesize(text);
    }).then(function (out) {
      return toAudio(out, rate);
    });
  }

  window.TutorPiper = { speak: speak, voices: VOICES.slice() };
})();
