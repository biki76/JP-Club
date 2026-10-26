/* Phase 12 — offline-first cloud sync (Supabase).
 * localStorage is local authority; Supabase is the cross-device mirror.
 * Exposes window.CloudSync.
 */
(function () {
  'use strict';

  var SYNC_KEYS = [
    'nihongo_progress', 'nihongo_bookmarks',
    'nihongo_srs_cards', 'nihongo_srs_log', 'nihongo_srs_prefs', 'nihongo_srs_meta',
    'nihongo_quiz_prefs', 'nihongo_quiz_history', 'nihongo_quiz_last_lesson',
    'nihongo_kanji_prefs', 'nihongo_kanji_quiz_history',
    'nihongo_placement_result'
  ];
  var SYNC_KEY_SET = {};
  SYNC_KEYS.forEach(function (k) { SYNC_KEY_SET[k] = true; });

  var META_KEY = 'nihongo_sync_meta';
  var QUEUE_KEY = 'nihongo_sync_queue';
  var USER_KEY = 'nihongo_sync_user';

  var client = null, user = null, ready = false, syncing = false;
  var pushTimer = null, listeners = [];

  function readJSON(k, fb) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; }
    catch (e) { return fb; }
  }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function nowMs() { return Date.now(); }
  function emit(ev, d) {
    listeners.forEach(function (fn) { try { fn(ev, d); } catch (e) {} });
    document.dispatchEvent(new CustomEvent('cloud:' + ev, { detail: d }));
  }
  function txt(en, bn) {
    return '<span data-en="' + en + '" data-bn="' + bn + '">' + en + '</span>';
  }

  /* ---- intercept writes ---- */
  var _setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    _setItem.call(this, key, value);
    if (this !== window.localStorage) return;
    if (!SYNC_KEY_SET[key]) return;
    markDirty(key);
  };

  function markDirty(key) {
    var meta = readJSON(META_KEY, {});
    meta[key] = nowMs();
    writeJSON(META_KEY, meta);
    var q = readJSON(QUEUE_KEY, []);
    if (q.indexOf(key) === -1) { q.push(key); writeJSON(QUEUE_KEY, q); }
    schedulePush();
  }

  function clearDirty(keys) {
    var q = readJSON(QUEUE_KEY, []).filter(function (k) { return keys.indexOf(k) === -1; });
    writeJSON(QUEUE_KEY, q);
  }

  function schedulePush() {
    if (!ready || !user || !navigator.onLine) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { flush(); }, 1200);
  }

  function markAllSyncedKeysDirty() {
    var meta = readJSON(META_KEY, {});
    var q = readJSON(QUEUE_KEY, []);
    var dirtyMeta = false;
    SYNC_KEYS.forEach(function (k) {
      if (localStorage.getItem(k) != null) {
        if (!meta[k]) { meta[k] = nowMs(); dirtyMeta = true; }
        if (q.indexOf(k) === -1) q.push(k);
      }
    });
    if (dirtyMeta) writeJSON(META_KEY, meta);
    writeJSON(QUEUE_KEY, q);
  }

  /* ---- merge rules ---- */
  function mergeProgress(l, r, la, ra) {
    if (!l) return r; if (!r) return l;
    var w = la >= ra ? l : r, same = l.currentLesson === r.currentLesson;
    return {
      courseId: w.courseId || r.courseId,
      totalLessons: w.totalLessons || r.totalLessons,
      completedLessons: Math.max(l.completedLessons || 0, r.completedLessons || 0),
      currentLesson: w.currentLesson,
      currentLessonTitle: w.currentLessonTitle,
      currentLessonProgress: same
        ? Math.max(l.currentLessonProgress || 0, r.currentLessonProgress || 0)
        : (w.currentLessonProgress || 0),
      updatedAt: Math.max(l.updatedAt || 0, r.updatedAt || 0)
    };
  }
  function mergeBookmarks(l, r) {
    var o = {};
    [l || {}, r || {}].forEach(function (m) {
      Object.keys(m).forEach(function (s) { o[s] = Math.max(o[s] || 0, m[s] || 0); });
    });
    return o;
  }
  function mergeSrsCards(l, r) {
    var o = {};
    [l || {}, r || {}].forEach(function (m) {
      Object.keys(m).forEach(function (id) {
        var a = o[id], b = m[id];
        if (!a) { o[id] = b; return; }
        if (!b) return;
        var aAt = a.lastReviewed || 0, bAt = b.lastReviewed || 0;
        o[id] = (bAt > aAt || (bAt === aAt && (b.reps || 0) > (a.reps || 0))) ? b : a;
      });
    });
    return o;
  }
  function mergeSrsLog(l, r) {
    var o = {};
    [l || {}, r || {}].forEach(function (m) {
      Object.keys(m).forEach(function (d) {
        var a = o[d], b = m[d];
        if (!a) { o[d] = b; return; }
        if (!b) return;
        o[d] = {
          again: Math.max(a.again || 0, b.again || 0),
          hard: Math.max(a.hard || 0, b.hard || 0),
          good: Math.max(a.good || 0, b.good || 0),
          easy: Math.max(a.easy || 0, b.easy || 0),
          total: Math.max(a.total || 0, b.total || 0),
          newIntroduced: Math.max(a.newIntroduced || 0, b.newIntroduced || 0)
        };
      });
    });
    return o;
  }
  function mergeSrsMeta(l, r, la, ra) {
    var w = la >= ra ? l : r, ls = la >= ra ? r : l;
    return {
      totalReviews: Math.max((l && l.totalReviews) || 0, (r && r.totalReviews) || 0),
      streakCurrent: w.streakCurrent != null ? w.streakCurrent : ls.streakCurrent,
      streakLongest: Math.max((l && l.streakLongest) || 0, (r && r.streakLongest) || 0),
      streakLastDay: w.streakLastDay || ls.streakLastDay
    };
  }
  function mergeQuizHistory(l, r) {
    var o = {};
    [l || {}, r || {}].forEach(function (m) {
      Object.keys(m).forEach(function (s) {
        var a = o[s], b = m[s];
        if (!a) { o[s] = b; return; }
        if (!b) return;
        o[s] = {
          best: Math.max(a.best || 0, b.best || 0),
          last: (b.lastAt || 0) >= (a.lastAt || 0) ? b.last : a.last,
          attempts: Math.max(a.attempts || 0, b.attempts || 0),
          lastAt: Math.max(a.lastAt || 0, b.lastAt || 0)
        };
      });
    });
    return o;
  }
  function mergeLWW(l, r, la, ra) {
    if (!l) return r; if (!r) return l;
    return la >= ra ? l : r;
  }
  function merge(key, l, r, la, ra) {
    switch (key) {
      case 'nihongo_progress': return mergeProgress(l, r, la, ra);
      case 'nihongo_bookmarks': return mergeBookmarks(l, r);
      case 'nihongo_srs_cards': return mergeSrsCards(l, r);
      case 'nihongo_srs_log': return mergeSrsLog(l, r);
      case 'nihongo_srs_meta': return mergeSrsMeta(l, r, la, ra);
      case 'nihongo_quiz_history': return mergeQuizHistory(l, r);
      default: return mergeLWW(l, r, la, ra);
    }
  }

  /* ---- client ---- */
  function isConfigured() {
    var c = window.SUPABASE_CONFIG;
    return !!(c && c.url && (c.anonKey || c.publishableKey) &&
      !/REPLACE-ME|YOUR-PROJECT/.test(c.url));
  }
  function initClient() {
    if (client) return client;
    if (!isConfigured() || !window.supabase) return null;
    var c = window.SUPABASE_CONFIG;
    client = window.supabase.createClient(c.url, c.anonKey || c.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return client;
  }

  function setUser(u) {
    user = u || null; ready = !!user;
    if (user) {
      localStorage.setItem(USER_KEY, user.id);
      emit('user', { user: user });
      markAllSyncedKeysDirty();
      pull();
    } else {
      localStorage.removeItem(USER_KEY);
      emit('user', { user: null });
    }
    updateChip();
  }

  async function pull() {
    if (!user || !client || syncing || !navigator.onLine) return;
    syncing = true; emit('syncing', { on: true });
    try {
      var res = await client.from('user_state')
        .select('key, value, client_updated_at').eq('user_id', user.id);
      if (res.error) throw res.error;
      var meta = readJSON(META_KEY, {}), changed = [];
      (res.data || []).forEach(function (row) {
        var key = row.key;
        if (!SYNC_KEY_SET[key]) return;
        var la = meta[key] || 0, ra = row.client_updated_at || 0;
        var l = readJSON(key, null), r = row.value;
        var merged = merge(key, l, r, la, ra);
        var mj = JSON.stringify(merged);
        var cj = l == null ? 'null' : JSON.stringify(l);
        if (mj !== cj) { _setItem.call(localStorage, key, mj); changed.push(key); }
        meta[key] = Math.max(la, ra);
      });
      writeJSON(META_KEY, meta);
      if (changed.length) emit('pulled', { keys: changed });
    } catch (err) {
      console.warn('[cloud] pull failed', err);
      emit('error', { phase: 'pull', error: err });
    } finally {
      syncing = false; emit('syncing', { on: false });
      flush();
    }
  }

  async function flush() {
    if (!user || !client || syncing || !navigator.onLine) return;
    var queue = readJSON(QUEUE_KEY, []).filter(function (k) { return SYNC_KEY_SET[k]; });
    if (!queue.length) return;
    syncing = true; emit('syncing', { on: true });
    var meta = readJSON(META_KEY, {}), pushed = [];
    try {
      for (var i = 0; i < queue.length; i++) {
        var key = queue[i];
        var raw = localStorage.getItem(key);
        if (raw == null) continue;
        var value; try { value = JSON.parse(raw); } catch (e) { continue; }
        var res = await client.from('user_state').upsert({
          user_id: user.id,
          key: key,
          value: value,
          client_updated_at: meta[key] || nowMs(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,key' });
        if (res.error) throw res.error;
        pushed.push(key);
      }
      clearDirty(pushed);
      emit('pushed', { keys: pushed });
    } catch (err) {
      console.warn('[cloud] push failed', err);
      emit('error', { phase: 'push', error: err });
    } finally {
      syncing = false; emit('syncing', { on: false });
    }
  }

  /* ---- auth ---- */
  async function signInEmail(email, password) {
    var c = initClient(); if (!c) throw new Error('Supabase not configured.');
    var res = await c.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw res.error; return res.data;
  }
  async function signUpEmail(email, password) {
    var c = initClient(); if (!c) throw new Error('Supabase not configured.');
    var res = await c.auth.signUp({
      email: email, password: password,
      options: { emailRedirectTo: window.SUPABASE_CONFIG.redirectTo }
    });
    if (res.error) throw res.error; return res.data;
  }
  async function signInMagic(email) {
    var c = initClient(); if (!c) throw new Error('Supabase not configured.');
    var res = await c.auth.signInWithOtp({
      email: email, options: { emailRedirectTo: window.SUPABASE_CONFIG.redirectTo }
    });
    if (res.error) throw res.error; return res.data;
  }
  async function signInGoogle() {
    var c = initClient(); if (!c) throw new Error('Supabase not configured.');
    var res = await c.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: window.SUPABASE_CONFIG.redirectTo }
    });
    if (res.error) throw res.error; return res.data;
  }
  async function signOut() {
    var c = initClient(); if (!c) return;
    await c.auth.signOut();
    setUser(null);
  }
  async function resetPassword(email) {
    var c = initClient(); if (!c) throw new Error('Supabase not configured.');
    var res = await c.auth.resetPasswordForEmail(email, {
      redirectTo: window.SUPABASE_CONFIG.redirectTo
    });
    if (res.error) throw res.error; return res.data;
  }

  /* ---- chip ---- */
  function updateChip() {
    var chip = document.getElementById('cloud-chip');
    if (!chip) return;
    if (!user) {
      chip.innerHTML = '<a class="cloud-chip__btn" href="auth.html">'
        + txt('Sign in to sync', 'সিঙ্ক করতে সাইন ইন করুন') + '</a>';
      return;
    }
    var initial = (user.email || '?').charAt(0).toUpperCase();
    chip.innerHTML =
      '<button class="cloud-chip__btn cloud-chip__btn--user" type="button" aria-haspopup="menu" aria-expanded="false">'
      + '<span class="cloud-chip__avatar" aria-hidden="true">' + initial + '</span>'
      + '<span class="cloud-chip__email">' + (user.email || '') + '</span></button>'
      + '<div class="cloud-chip__menu" role="menu" hidden>'
      + '<button type="button" role="menuitem" data-cloud-sync>' + txt('Sync now', 'এখনই সিঙ্ক করুন') + '</button>'
      + '<button type="button" role="menuitem" data-cloud-signout>' + txt('Sign out', 'সাইন আউট') + '</button>'
      + '</div>';

    var btn = chip.querySelector('.cloud-chip__btn--user');
    var menu = chip.querySelector('.cloud-chip__menu');
    btn.addEventListener('click', function () {
      var open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
    chip.querySelector('[data-cloud-sync]').addEventListener('click', function () { menu.hidden = true; pull(); });
    chip.querySelector('[data-cloud-signout]').addEventListener('click', function () { menu.hidden = true; signOut(); });
  }

  function injectChip(tries) {
    tries = tries == null ? 25 : tries;
    if (document.getElementById('cloud-chip')) return;
    var host = document.querySelector('.shell-header__actions')
            || document.querySelector('[data-shell-header]');
    if (!host) {
      if (tries > 0) setTimeout(function () { injectChip(tries - 1); }, 60);
      return;
    }
    var chip = document.createElement('div');
    chip.id = 'cloud-chip';
    chip.className = 'cloud-chip';
    host.appendChild(chip);
    updateChip();
  }

  /* ---- boot ---- */
  function boot() {
    injectChip();
    var c = initClient();
    if (!c) {
      if (!isConfigured()) console.info('[cloud] Supabase not configured — local-only mode.');
      return;
    }
    c.auth.onAuthStateChange(function (event, session) {
      var next = session && session.user ? session.user : null;
      if (event === 'SIGNED_OUT') { setUser(null); return; }
      if (next && (!user || user.id !== next.id)) setUser(next);
    });
    c.auth.getSession().then(function (res) {
      var s = res && res.data && res.data.session;
      if (s && s.user) setUser(s.user);
      else { ready = true; updateChip(); }
    });
    window.addEventListener('online', function () { emit('online'); flush().then(function () { pull(); }); });
    window.addEventListener('offline', function () { emit('offline'); });
  }

  window.CloudSync = {
    init: boot,
    on: function (fn) { listeners.push(fn); return function () {
      listeners = listeners.filter(function (l) { return l !== fn; }); }; },
    signInEmail: signInEmail, signUpEmail: signUpEmail,
    signInMagic: signInMagic, signInGoogle: signInGoogle,
    signOut: signOut, resetPassword: resetPassword,
    pull: pull, flush: flush,
    getUser: function () { return user; },
    isReady: function () { return ready; },
    isConfigured: isConfigured,
    dirty: function () { return readJSON(QUEUE_KEY, []); },
    meta: function () { return readJSON(META_KEY, {}); },
    SYNC_KEYS: SYNC_KEYS.slice()
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
