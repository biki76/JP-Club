/* js/security/jp-auth.js — one Supabase client, server-verified session, route guard.
 *
 * Load order (all defer): supabase-js → supabase-config.js → cloud.js → sanitize.js → jp-auth.js
 *
 * Honest limits of a static site (GitHub Pages):
 *  - There is no server to set HttpOnly cookies, so supabase-js keeps the session in
 *    localStorage. The CSP added by tools/apply-hardening.mjs (connect-src allow-list,
 *    object-src none, base-uri self) limits what injected script could do with it.
 *  - This guard is UX only. Real protection = RLS in sql/hardening.sql + JWT checks in
 *    the edge functions. Never put secrets in pages that "only logged-in users" can see.
 *
 * Mark a page as protected:  <html data-auth-required>
 */
(function (root) {
  'use strict';

  var doc = root.document;
  var client = null, attached = null;
  var listeners = [];

  function attach(c) {
    if (attached === c) return c;
    attached = c;
    c.auth.onAuthStateChange(function (event, session) {
      listeners.forEach(function (fn) { try { fn(event, session); } catch (e) {} });
    });
    return c;
  }

  function cfg() { return root.SUPABASE_CONFIG || {}; }
  function configured() {
    var c = cfg();
    return !!(c.url && (c.publishableKey || c.anonKey) && !/REPLACE-ME|YOUR-PROJECT/.test(c.url));
  }

  /* Reuse cloud.js's client when it exists — two clients on one storage key fight over locks. */
  function getClient() {
    if (root.__sb && root.__sb.auth) return attach(root.__sb);
    if (client) return attach(client);
    if (!configured() || !root.supabase || typeof root.supabase.createClient !== 'function') return null;
    var c = cfg();
    client = root.supabase.createClient(c.url, c.publishableKey || c.anonKey, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    root.__sb = client;
    return attach(client);
  }

  function waitForClient(timeoutMs) {
    var t0 = Date.now(), limit = timeoutMs || 8000;
    return new Promise(function (resolve, reject) {
      (function tick() {
        var c = getClient();
        if (c) return resolve(c);
        if (Date.now() - t0 > limit) return reject(new Error('auth_unavailable'));
        setTimeout(tick, 100);
      })();
    });
  }

  function isNetworkError(err) {
    if (!err) return false;
    var s = (err.name || '') + ' ' + (err.message || '');
    return /fetch|network|failed to|timeout|abort/i.test(s) || err.status === 0 || err.status >= 500;
  }

  /* getUser() asks the Auth server to validate the JWT — getSession() only reads storage. */
  async function verifiedUser() {
    var c = await waitForClient();
    var res = await c.auth.getUser();
    if (res.error) {
      if (isNetworkError(res.error)) {
        var s = await c.auth.getSession();           // offline: trust unexpired local session
        var sess = s && s.data && s.data.session;
        if (sess && sess.expires_at * 1000 > Date.now()) return { user: sess.user, offline: true };
      }
      return { user: null, error: res.error };
    }
    return { user: res.data.user, offline: false };
  }

  function currentPage() {
    var p = (root.location.pathname.split('/').pop() || 'home.html') + root.location.search + root.location.hash;
    return root.Sanitize ? root.Sanitize.safeNext(p, 'home.html') : 'home.html';
  }

  function toLogin() {
    var next = encodeURIComponent(currentPage());
    root.location.replace(root.Sanitize.appUrl('auth.html?next=' + next));
  }

  /* Protected-route wrapper. Resolves true when the visitor may stay. */
  async function requireAuth() {
    var html = doc.documentElement;
    try {
      var r = await verifiedUser();
      if (!r.user) { toLogin(); return false; }
      html.setAttribute('data-auth', r.offline ? 'offline' : 'ok');
      return true;
    } catch (e) {
      toLogin();
      return false;
    }
  }

  async function signOut() {
    try { var c = await waitForClient(); await c.auth.signOut({ scope: 'local' }); } catch (e) {}
    root.location.replace(root.Sanitize.appUrl('home.html'));
  }

  root.JPAuth = {
    client: getClient,
    ready: waitForClient,
    configured: configured,
    verifiedUser: verifiedUser,
    requireAuth: requireAuth,
    signOut: signOut,
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); getClient(); }
  };

  if (doc.documentElement.hasAttribute('data-auth-required')) {
    requireAuth();
  }
  getClient();
})(window);
