(function () {
  'use strict';
  var a = document.getElementById('hero-cta');
  if (!a) return;
  var p = null;
  try { p = JSON.parse(localStorage.getItem('nihongo_progress') || 'null'); } catch (e) {}
  var n = p && p.currentLesson > 0 ? p.currentLesson : 1;
  var bnNum = function (x) { return String(x).replace(/\d/g, function (d) { return '০১২৩৪৫৬৭৮৯'[d]; }); };
  var en = p ? 'Continue Lesson ' + n : 'Start Lesson 1 \u2014 free';
  var bn = p ? 'পাঠ ' + bnNum(n) + ' চালিয়ে যান' : 'পাঠ ১ শুরু করুন \u2014 বিনামূল্যে';
  var isBn = (localStorage.getItem('nihongo_lang') || document.documentElement.lang) === 'bn';
  a.href = 'lesson.html?lesson=minna-' + String(n).padStart(3, '0');
  a.innerHTML = '<span data-en="' + en + '" data-bn="' + bn + '">' + (isBn ? bn : en) + '</span>';
})();
