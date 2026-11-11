/* js/data-chunks.js — lazy loader for the chunked datasets produced by tools/build-data.mjs.
 *
 *   await DataChunks.grammar.index()          → { total, lessons, items[] }   (slim rows, ~18 KB gz)
 *   await DataChunks.grammar.lesson(12)       → { lesson, items[] }           (full examples, on demand)
 *   await DataChunks.vocab.index()            → manifest (levels → chunks)
 *   await DataChunks.vocab.page('N3', 2)      → items of the 2nd chunk
 *   await DataChunks.vocab.search('あい', 30) → [{ id, kanji, furigana, romaji, en, chunk }] (loads search.json once)
 *   await DataChunks.vocab.get('mimikara-n3-0001')
 *
 * Every request: cached per page load, 10 s timeout, 2 retries with back-off, failed promises are evicted
 * so the next call retries. Chunk URLs carry ?v=<sha>, so the service worker's stale-while-revalidate
 * rule for /data/*.json can never serve an outdated chunk after a rebuild.
 */
(function () {
  'use strict';

  var cache = new Map();

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function fetchOnce(url, timeoutMs) {
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, timeoutMs);
    try {
      var res = await fetch(url, { signal: ctl.signal });
      if (!res.ok) { var e = new Error('HTTP ' + res.status + ' for ' + url); e.status = res.status; throw e; }
      return await res.json();
    } finally { clearTimeout(t); }
  }

  function fetchJSON(url, opts) {
    opts = opts || {};
    if (cache.has(url)) return cache.get(url);
    var retries = opts.retries == null ? 2 : opts.retries;
    var p = (async function () {
      for (var n = 0; ; n++) {
        try { return await fetchOnce(url, opts.timeoutMs || 10000); }
        catch (e) {
          if (n >= retries || (e.status && e.status >= 400 && e.status < 500)) throw e;   // 4xx: do not retry
          await sleep(400 * Math.pow(2, n));
        }
      }
    })();
    cache.set(url, p);
    p.catch(function () { cache.delete(url); });
    return p;
  }

  function versioned(base, entry) { return base + '/' + entry.file + (entry.sha ? '?v=' + entry.sha : ''); }

  /* ---------- grammar ---------- */
  var G_BASE = 'data/grammar';
  var grammar = {
    index: function () { return fetchJSON(G_BASE + '/index.json'); },
    lesson: async function (n) {
      var idx = await grammar.index();
      var entry = idx.lessons && idx.lessons[String(n)];
      if (!entry) return { lesson: n, items: [] };
      return fetchJSON(versioned(G_BASE, entry));
    }
  };

  /* ---------- mimikara vocabulary ---------- */
  var V_BASE = 'data/mimikara/vocab';
  var vocab = {
    index: function () { return fetchJSON(V_BASE + '/index.json'); },
    page: async function (level, n) {
      var idx = await vocab.index();
      var lv = idx.levels && idx.levels[String(level).toUpperCase()];
      var entry = lv && lv.chunks[(n || 1) - 1];
      if (!entry) return [];
      return (await fetchJSON(versioned(V_BASE, entry))).items;
    },
    pages: async function (level) {
      var idx = await vocab.index();
      var lv = idx.levels && idx.levels[String(level).toUpperCase()];
      return lv ? lv.chunks.length : 0;
    },
    _search: async function () {
      var idx = await vocab.index();
      var s = await fetchJSON(V_BASE + '/search.json' + (idx.search && idx.search.sha ? '?v=' + idx.search.sha : ''));
      var c = s.columns, ix = {}; c.forEach(function (k, i) { ix[k] = i; });
      return s.rows.map(function (r) { var o = {}; Object.keys(ix).forEach(function (k) { o[k] = r[ix[k]]; }); return o; });
    },
    /* substring match on kanji / reading / romaji / English; kanji & kana matched as typed */
    search: async function (q, limit) {
      q = String(q || '').trim().toLowerCase();
      if (!q) return [];
      var rows = await (vocab._rows || (vocab._rows = vocab._search()));
      var out = [], max = limit || 30;
      for (var i = 0; i < rows.length && out.length < max; i++) {
        var r = rows[i];
        if (r.kanji.indexOf(q) > -1 || r.furigana.indexOf(q) > -1 || r.romaji.toLowerCase().indexOf(q) > -1 || r.en.toLowerCase().indexOf(q) > -1) out.push(r);
      }
      return out;
    },
    get: async function (id) {
      var rows = await (vocab._rows || (vocab._rows = vocab._search()));
      var hit = rows.find(function (r) { return r.id === id; });
      if (!hit) return null;
      var idx = await vocab.index();
      var level = Object.keys(idx.levels).find(function (lv) { return idx.levels[lv].chunks.some(function (c) { return c.id === hit.chunk; }); });
      var entry = level && idx.levels[level].chunks.find(function (c) { return c.id === hit.chunk; });
      if (!entry) return null;
      return (await fetchJSON(versioned(V_BASE, entry))).items.find(function (w) { return w.id === id; }) || null;
    }
  };

  window.DataChunks = { fetchJSON: fetchJSON, grammar: grammar, vocab: vocab, clearCache: function () { cache.clear(); vocab._rows = null; } };
})();
