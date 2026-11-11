/**
 * Unified Language State Initializer (Bridges i18n.js and ui-lang.js)
 */
(function (global) {
  'use strict';

  const SUPPORTED_LANGS = new Set(['en', 'bn', 'hi', 'id', 'vi', 'fil', 'ko', 'ne', 'ur', 'zh']);
  const STORAGE_KEYS = ['jp_club_lang', 'ui_lang', 'jp_lang', 'lang'];

  function getSavedLang() {
    try {
      for (const key of STORAGE_KEYS) {
        const val = localStorage.getItem(key);
        if (val && SUPPORTED_LANGS.has(val.toLowerCase())) {
          return val.toLowerCase();
        }
      }
    } catch (_) {}
    return 'en';
  }

  function setSavedLang(lang) {
    const clean = SUPPORTED_LANGS.has(String(lang).toLowerCase()) ? String(lang).toLowerCase() : 'en';
    try {
      for (const key of STORAGE_KEYS) {
        localStorage.setItem(key, clean);
      }
    } catch (_) {}
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute(' data-ui-lang'.trim(), clean);
      document.documentElement.lang = clean === 'zh' ? 'zh-CN' : clean;
    }
    global.dispatchEvent(new CustomEvent('jp:lang-changed', { detail: { lang: clean } }));
    return clean;
  }

  const initialLang = getSavedLang();
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('data-ui-lang', initialLang);
  }

  global.JPUILang = { get: getSavedLang, set: setSavedLang, supported: Array.from(SUPPORTED_LANGS) };
})(typeof window !== 'undefined' ? window : globalThis);
