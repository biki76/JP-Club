(function () {
  try {
    var l = localStorage.getItem('nihongo_ui_lang');
    if (!l) return;
    var d = document.documentElement;
    d.setAttribute('data-ui-lang', l);
    if (l === 'ur') d.setAttribute('dir', 'rtl');
  } catch (e) {}
})();
