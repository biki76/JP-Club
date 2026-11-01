// qwen: grammar-ref — render + filter content/grammar-ref.json
(function () {
  var list = document.getElementById('gr-list');
  var filter = document.getElementById('gr-filter');
  var items = [];
  function row(it) {
    var card = document.createElement('article');
    card.className = 'gr-card';
    var ls = document.createElement('span');
    ls.className = 'gr-lesson';
    ls.setAttribute('data-en', 'Lesson ' + it.lesson);
    ls.setAttribute('data-bn', 'পাঠ ' + it.lesson);
    ls.textContent = 'Lesson ' + it.lesson;
    var h = document.createElement('h2');
    h.className = 'gr-jp';
    h.lang = 'ja';
    h.textContent = it.jp || '';
    var r = document.createElement('p');
    r.className = 'gr-romaji';
    r.textContent = it.romaji || '';
    var en = document.createElement('p');
    en.className = 'gr-en';
    en.setAttribute('data-en', it.en || '');
    en.setAttribute('data-bn', it.bn || '');
    en.textContent = it.en || '';
    var ex = document.createElement('p');
    ex.className = 'gr-ex';
    ex.lang = 'ja';
    ex.textContent = it.example || '';
    card.appendChild(ls); card.appendChild(h); card.appendChild(r); card.appendChild(en); card.appendChild(ex);
    return card;
  }
  function render(q) {
    q = (q || '').toLowerCase();
    list.innerHTML = '';
    var shown = items.filter(function (it) {
      return !q || ((it.jp || '') + (it.en || '') + (it.bn || '') + (it.romaji || '')).toLowerCase().indexOf(q) > -1;
    });
    shown.forEach(function (it) { list.appendChild(row(it)); });
    if (!shown.length) {
      var e = document.createElement('p');
      e.className = 'gr-empty';
      e.setAttribute('data-en', 'No matches');
      e.setAttribute('data-bn', 'কিছু মেলেনি');
      e.textContent = 'No matches';
      list.appendChild(e);
    }
  }
  fetch('content/grammar-ref.json').then(function (r) { return r.ok ? r.json() : []; }).then(function (j) {
    items = Array.isArray(j) ? j : [];
    render('');
  }).catch(function () { render(''); });
  if (filter) filter.addEventListener('input', function () { render(filter.value); });
})();
