(function () {
  document.body.classList.add('ai-tutor-page');
  var host = document.getElementById('tutor-host');
  var tries = 0;
  (function mount() {
    var win = document.getElementById('ai-tutor-window');
    if (win && host) { host.appendChild(win); win.classList.add('is-open'); return; }
    if (tries++ < 80) setTimeout(mount, 250);
  })();
})();
