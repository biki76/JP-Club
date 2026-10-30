/* js/content-status.js — lesson page notice (additive; lesson.html only).
 * Reads data/lessons/status.json and, for lessons that are not yet complete,
 * shows an honest notice above the tabs. Fails silently: no status file, no notice. */
(function () {
  'use strict';
  function lang() {
    try { return localStorage.getItem('nihongo_lang') === 'bn' ? 'bn' : 'en'; }
    catch (e) { return 'en'; }
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function span(en, bn) {
    return '<span data-en="' + esc(en) + '" data-bn="' + esc(bn) + '">' +
           esc(lang() === 'bn' ? bn : en) + '</span>';
  }
  function message(c) {
    if (c.status === 'stub') {
      return span(
        'This lesson is still being written. It has ' + c.vocab + ' words so far; grammar, reading and practice may be incomplete.',
        'এই পাঠটি এখনো লেখা হচ্ছে। এখন পর্যন্ত ' + c.vocab + 'টি শব্দ আছে; ব্যাকরণ, পাঠ ও অনুশীলন অসম্পূর্ণ থাকতে পারে।');
    }
    if (c.status === 'partial') {
      return span(
        'Grammar and practice for this lesson are still being written. Vocabulary is available.',
        'এই পাঠের ব্যাকরণ ও অনুশীলন এখনো লেখা হচ্ছে। শব্দভান্ডার পাওয়া যাচ্ছে।');
    }
    if (c.status === 'draft') {
      return span(
        'Draft content: reading and listening passages are sample placeholders, and nothing here has been teacher-reviewed yet.',
        'খসড়া কনটেন্ট: পাঠ ও শ্রবণ অংশ নমুনা মাত্র, এবং এখানকার কিছুই এখনো শিক্ষক দ্বারা পর্যালোচিত হয়নি।');
    }
    return '';
  }
  async function boot() {
    var slug = new URLSearchParams(location.search).get('lesson');
    var anchor = document.getElementById('lv-tabs');
    if (!slug || !anchor || document.getElementById('cs-notice')) return;
    try {
      var res = await fetch('data/lessons/status.json');
      if (!res.ok) return;
      var data = await res.json();
      var c = data && data.lessons && data.lessons[slug];
      if (!c) return;
      var html = message(c);
      if (!html) return;
      var box = document.createElement('aside');
      box.id = 'cs-notice';
      box.className = 'cs-notice';
      box.setAttribute('role', 'note');
      box.innerHTML = '<p>' + html + '</p>';
      anchor.parentNode.insertBefore(box, anchor);
    } catch (e) { /* silent: notice is optional */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
