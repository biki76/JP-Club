// qwen: kanji-audio — TTS speak buttons on kanji entries
(function () {
  if (!('speechSynthesis' in window)) return;
  function speak(text) {
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP';
      u.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function ensure() {
    document.querySelectorAll('[lang="ja"]').forEach(function (el) {
      if (el.closest('rt') || el.dataset.speakDone) return;
      el.dataset.speakDone = '1';
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'speak-btn';
      b.setAttribute('data-speak', '1');
      b.setAttribute('data-en', 'Play audio');
      b.setAttribute('data-bn', 'অডিও শুনুন');
      b.setAttribute('aria-label', 'Play audio');
      b.textContent = '\uD83D\uDD0A';
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        speak((el.textContent || '').replace(/\uD83D\uDD0A/g, '').trim().slice(0, 40));
      });
      el.appendChild(b);
    });
  }
  ensure();
  new MutationObserver(ensure).observe(document.body, { childList: true, subtree: true });
})();
