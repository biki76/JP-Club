/**
 * Kanji Audio Controller + Global Audio Mutex (Prevents overlapping playback & Blob leaks)
 */
(function (global) {
  'use strict';

  let activeAudio = null;
  let activeBlobUrl = null;

  function stopAllAudio() {
    try {
      if (global.speechSynthesis && global.speechSynthesis.speaking) {
        global.speechSynthesis.cancel();
      }
    } catch (_) {}

    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      } catch (_) {}
      activeAudio = null;
    }

    if (activeBlobUrl) {
      try {
        URL.revokeObjectURL(activeBlobUrl);
      } catch (_) {}
      activeBlobUrl = null;
    }

    document.querySelectorAll('audio').forEach((el) => {
      try { el.pause(); } catch (_) {}
    });
  }

  function registerAudioInstance(audioEl, blobUrl = null) {
    stopAllAudio();
    activeAudio = audioEl;
    activeBlobUrl = blobUrl;
    if (audioEl) {
      audioEl.addEventListener('ended', () => {
        if (activeBlobUrl) {
          try { URL.revokeObjectURL(activeBlobUrl); } catch (_) {}
          activeBlobUrl = null;
        }
      }, { once: true });
    }
  }

  function speakJapanese(text, rate = 0.92) {
    if (!text) return;
    stopAllAudio();

    if (!('speechSynthesis' in global)) return;
    const utter = new SpeechSynthesisUtterance(String(text).trim());
    utter.lang = 'ja-JP';
    utter.rate = rate;

    const voices = global.speechSynthesis.getVoices();
    const jpVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ja'));
    if (jpVoice) utter.voice = jpVoice;

    global.speechSynthesis.speak(utter);
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-kanji-speak], [data-speak-jp], .kanji-audio-btn');
    if (!btn) return;
    e.preventDefault();
    const text = btn.getAttribute('data-kanji-speak') || btn.getAttribute('data-speak-jp') || btn.getAttribute('data-reading') || btn.textContent;
    speakJapanese(text);
  });

  global.JPAudioMutex = { stopAll: stopAllAudio, register: registerAudioInstance, speak: speakJapanese };
  global.speakJapanese = speakJapanese;
})(typeof window !== 'undefined' ? window : globalThis);
