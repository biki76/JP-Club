/**
 * Vocabulary Pronunciation Audio Helper for JP-Club
 */
(function (global) {
  'use strict';

  function speakWord(text) {
    if (!text) return;
    if (global.JPAudioMutex && typeof global.JPAudioMutex.speak === 'function') {
      global.JPAudioMutex.speak(text, 0.88);
      return;
    }
    if (!('speechSynthesis' in global)) return;
    global.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(String(text).trim());
    utter.lang = 'ja-JP';
    utter.rate = 0.88;
    const voices = global.speechSynthesis.getVoices();
    const jpVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ja'));
    if (jpVoice) utter.voice = jpVoice;
    global.speechSynthesis.speak(utter);
  }

  function createMicButton(textToPronounce) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vocab-mic-btn';
    btn.setAttribute('aria-label', 'Pronounce word');
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v1a7 7 0 0 1-14 0v-1"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
    btn.style.cssText = 'background:transparent; border:none; cursor:pointer; color:var(--accent-color, #3b82f6); padding:4px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; transition:background 0.2s;';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakWord(textToPronounce);
    });
    return btn;
  }

  global.JPVocbAudio = { speak: speakWord, createMicButton: createMicButton };
})(typeof window !== 'undefined' ? window : globalThis);
