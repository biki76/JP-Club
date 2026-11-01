// qwen: empty-states — bilingual empty states for progress/bookmark lists
(function () {
  var TARGETS = ['#bookmarks-list', '.bookmarks-list', '#bookmark-list', '#progress-list', '.progress-list', '#reviews-list', '#history-list'];
  var TEXTS = {
    bookmark: ['No bookmarks yet', 'এখনো কোনো বুকমার্ক নেই'],
    progress: ['No progress yet — finish a lesson', 'এখনো অগ্রগতি নেই — একটি পাঠ শেষ করুন'],
    generic: ['Nothing here yet', 'এখনো কিছু নেই']
  };
  function kindOf(el) {
    var id = (el.id || '') + ' ' + (el.className || '');
    if (/bookmark/.test(id)) return 'bookmark';
    if (/progress|review|history/.test(id)) return 'progress';
    return 'generic';
  }
  function check() {
    TARGETS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        var count = Array.prototype.filter.call(el.children, function (c) {
          return !c.classList.contains('empty-state');
        }).length;
        var es = el.querySelector('.empty-state');
        if (count === 0 && !es) {
          var t = TEXTS[kindOf(el)];
          var d = document.createElement('div');
          d.className = 'empty-state';
          d.setAttribute('data-en', t[0]);
          d.setAttribute('data-bn', t[1]);
          d.textContent = t[0];
          el.appendChild(d);
        } else if (count > 0 && es) {
          es.remove();
        }
      });
    });
  }
  var timer = null;
  function schedule() { if (timer) clearTimeout(timer); timer = setTimeout(check, 250); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
})();
