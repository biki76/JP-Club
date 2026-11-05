/* One shared navigation config for every page. Must load BEFORE js/shell.js. */
(function () {
  'use strict';
  var C = window.SHELL_CONFIG = window.SHELL_CONFIG || {};
  C.navGroups = [
    { title: { en: 'Learn', bn: 'শিখুন' }, items: [
      { key: 'home', icon: 'home', href: 'home.html', label: { en: 'Home', bn: 'হোম' } },
      { key: 'lessons', icon: 'book', href: 'lessons.html', label: { en: 'Lessons', bn: 'পাঠসমূহ' } },
      { key: 'tutor', icon: 'practice', href: 'tutor.html', label: { en: 'AI Tutor', bn: 'এআই টিউটর' } },
      { key: 'flashcards', icon: 'practice', href: 'flashcards.html', label: { en: 'Flashcards', bn: 'ফ্ল্যাশকার্ড' } },
      { key: 'quiz', icon: 'practice', href: 'quiz.html', label: { en: 'Quiz', bn: 'কুইজ' } },
      { key: 'kanji', icon: 'kanji', href: 'kanji.html', label: { en: 'Kanji', bn: 'কাঞ্জি' } }
    ] },
    { title: { en: 'Explore', bn: 'অন্বেষণ' }, items: [
      { key: 'search', icon: 'search', href: 'search.html', label: { en: 'Search', bn: 'অনুসন্ধান' } },
      { key: 'progress', icon: 'practice', href: 'progress.html', label: { en: 'Progress', bn: 'অগ্রগতি' } },
      { key: 'placement', icon: 'book', href: 'placement.html', label: { en: 'Placement', bn: 'প্লেসমেন্ট' } }
    ] }
  ];
  C.bottomNav = [
    { href: 'home.html', icon: 'home', label: { en: 'Home', bn: 'হোম' } },
    { href: 'lessons.html', icon: 'book', label: { en: 'Lessons', bn: 'পাঠসমূহ' } },
    { href: 'flashcards.html', icon: 'practice', label: { en: 'Cards', bn: 'কার্ড' } },
    { href: 'search.html', icon: 'search', label: { en: 'Search', bn: 'অনুসন্ধান' } },
    { href: 'progress.html', icon: 'practice', label: { en: 'Progress', bn: 'অগ্রগতি' } }
  ];
})();
