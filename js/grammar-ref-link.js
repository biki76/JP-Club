// qwen: grammar-ref — CTA link on lessons page
(function () {
  if (!/lessons\.html$/.test(location.pathname)) return;
  function add() {
    if (document.querySelector('.grammar-ref-cta')) return;
    var host = document.querySelector('main') || document.body;
    var a = document.createElement('a');
    a.className = 'grammar-ref-cta';
    a.href = 'grammar.html';
    var s = document.createElement('span');
    s.setAttribute('data-en', 'Grammar reference');
    s.setAttribute('data-bn', 'ব্যাকরণ রেফারেন্স');
    s.textContent = 'Grammar reference';
    a.appendChild(s);
    host.prepend(a);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add);
  else add();
})();
