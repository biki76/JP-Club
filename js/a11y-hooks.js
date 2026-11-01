// qwen: a11y-hooks — reduced motion flag & audio keyboard shortcuts
(function () {
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var localReduced = localStorage.getItem('NIHONGO_REDUCED_MOTION') === '1';
  if (prefersReduced || localReduced) {
    document.documentElement.classList.add('reduce-motion');
    window.NIHONGO_REDUCED_MOTION = true;
    window.dispatchEvent(new CustomEvent('nihongo:reduced-motion', { detail: true }));
  }
  document.addEventListener('keydown', function (e) {
    var tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
    if (e.code === 'Space' || e.key === 'a' || e.key === 'A') {
      var btn = document.querySelector(
        'button[data-action="play"]' +
        ', button[data-audio]' +
        ', .audio-btn:not([disabled])' +
        ', button[aria-label*="audio" i]' +
        ', button[aria-label*="play" i]'
      );
      if (btn) {
        e.preventDefault();
        btn.click();
      }
    }
  });
})();
