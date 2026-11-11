/* js/ai-tutor/api.js — talks to the ai-tutor edge function.
 * Backward compatible: sendMessage / createSession / getSessions / getHistory / updateProfile /
 * isAuthenticated keep their signatures. New: streamMessage, deleteSession.
 * Uses the single shared client from JPAuth (falls back to window.__sb). */
(function () {
  'use strict';

  function cfg() { return window.SUPABASE_CONFIG || {}; }
  function endpoint() {
    var c = cfg();
    if (!c.url) throw new Error('Supabase URL not configured');
    return c.url.replace(/\/+$/, '') + '/functions/v1/ai-tutor';
  }

  async function client() {
    if (window.JPAuth) return window.JPAuth.ready(8000);
    for (var i = 0; i < 40; i++) {
      if (window.__sb && window.__sb.auth) return window.__sb;
      await new Promise(function (r) { setTimeout(r, 150); });
    }
    throw new Error('Supabase client not ready. Please refresh the page.');
  }

  async function getToken(forceRefresh) {
    var c = await client();
    if (forceRefresh) {
      var r = await c.auth.refreshSession();
      if (r.error || !r.data || !r.data.session) throw window.AITutorStream.TutorError('unauthorized', 'Please sign in to use the AI Tutor.', false, 401);
      return r.data.session.access_token;
    }
    var s = await c.auth.getSession();
    if (s.error || !s.data || !s.data.session) throw window.AITutorStream.TutorError('unauthorized', 'Please sign in to use the AI Tutor.', false, 401);
    return s.data.session.access_token;
  }

  /* Plain request/response actions. */
  async function call(action, payload) {
    var token = await getToken(false);
    var res = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'apikey': cfg().publishableKey || cfg().anonKey || '' },
      body: JSON.stringify(Object.assign({ action: action }, payload || {}))
    });
    var json = {};
    try { json = await res.json(); } catch (e) {}
    if (!res.ok || !json.success) {
      var err = new Error(json.message || json.error || ('HTTP ' + res.status));
      err.code = json.code || ('http_' + res.status); err.status = res.status;
      throw err;
    }
    return json.data;
  }

  function context() {
    var s = window.AITutorState ? window.AITutorState.get() : {};
    return { mode: s.mode, topic: s.topic, lesson: s.lesson, patterns: s.patterns,
             lang: document.documentElement.lang === 'bn' ? 'bn' : 'en' };
  }

  window.AITutorAPI = {
    /** Streaming send. handlers: { onMeta, onDelta, onDone, onAttempt }. Returns { cancel, done }. */
    streamMessage: function (message, level, sessionId, handlers) {
      handlers = handlers || {};
      var ctx = context();
      return window.AITutorStream.send({
        url: endpoint(),
        apikey: cfg().publishableKey || cfg().anonKey || '',
        getToken: getToken,
        body: { action: 'send_message', message: message, level: level, sessionId: sessionId || null,
                mode: ctx.mode, topic: ctx.topic, lesson: ctx.lesson, patterns: ctx.patterns, lang: ctx.lang },
        onMeta: handlers.onMeta, onDelta: handlers.onDelta, onDone: handlers.onDone, onAttempt: handlers.onAttempt
      });
    },
    sendMessage: function (message, level, sessionId) {          // non-streaming (kept for compatibility)
      var ctx = context();
      return call('send_message', { message: message, level: level, sessionId: sessionId || null,
        mode: ctx.mode, topic: ctx.topic, lesson: ctx.lesson, patterns: ctx.patterns, lang: ctx.lang });
    },
    createSession: function (level) { var c = context(); return call('create_session', { level: level, mode: c.mode, lesson: c.lesson }); },
    getSessions: function () { return call('get_sessions', {}); },
    getHistory: function (sessionId) { return call('get_history', { sessionId: sessionId }); },
    deleteSession: function (sessionId) { return call('delete_session', { sessionId: sessionId }); },
    updateProfile: function (level) { return call('update_profile', { level: level }); },
    isAuthenticated: function () { return !!(window.CloudSync && window.CloudSync.getUser && window.CloudSync.getUser()); }
  };
})();
