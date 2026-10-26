/* Phase 12 — auth page controller (auth.html). */
(function () {
  'use strict';

  var mode = 'in', busy = false;
  function $(id) { return document.getElementById(id); }

  function alertBox(msg, kind) {
    var el = $('auth-alert');
    if (!el) return;
    if (!msg) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.className = 'auth-alert auth-alert--' + (kind || 'error');
    el.textContent = msg;
  }

  function setMode(next) {
    mode = next;
    var up = mode === 'up';
    $('tab-in').classList.toggle('is-active', !up);
    $('tab-up').classList.toggle('is-active', up);
    $('tab-in').setAttribute('aria-selected', String(!up));
    $('tab-up').setAttribute('aria-selected', String(up));
    $('tab-in').tabIndex = up ? -1 : 0;
    $('tab-up').tabIndex = up ? 0 : -1;
    $('auth-title').innerHTML = up
      ? '<span data-en="Create your account" data-bn="আপনার অ্যাকাউন্ট তৈরি করুন">Create your account</span>'
      : '<span data-en="Welcome back" data-bn="আবার স্বাগতম">Welcome back</span>';
    $('auth-submit').innerHTML = up
      ? '<span data-en="Create account" data-bn="অ্যাকাউন্ট তৈরি করুন">Create account</span>'
      : '<span data-en="Sign in" data-bn="সাইন ইন">Sign in</span>';
    $('auth-password').autocomplete = up ? 'new-password' : 'current-password';
    alertBox(null);
  }

  async function withBusy(btn, fn) {
    if (busy) return;
    busy = true;
    var prev = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="auth-spinner" aria-hidden="true"></span>';
    try { await fn(); }
    catch (err) { alertBox((err && err.message) ? err.message : String(err), 'error'); }
    finally { busy = false; btn.disabled = false; btn.innerHTML = prev; }
  }

  function init() {
    if (!window.CloudSync || !window.CloudSync.isConfigured()) {
      alertBox('Supabase is not configured. Edit js/supabase-config.js with your project URL and publishable key.', 'error');
      return;
    }

    document.addEventListener('cloud:user', function (e) {
      if (e.detail && e.detail.user) location.replace('home.html');
    });
    setTimeout(function () {
      if (window.CloudSync.getUser()) location.replace('home.html');
    }, 350);

    document.querySelectorAll('.auth-tab').forEach(function (tab) {
      tab.addEventListener('click', function () { setMode(tab.getAttribute('data-mode')); });
      tab.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var next = mode === 'in' ? 'up' : 'in';
        setMode(next);
        document.querySelector('.auth-tab[data-mode="' + next + '"]').focus();
      });
    });

    $('auth-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var email = $('auth-email').value.trim();
      var pass = $('auth-password').value;
      if (!email) { alertBox('Enter your email.'); return; }
      if (mode === 'up' && pass.length < 6) { alertBox('Password must be at least 6 characters.'); return; }
      withBusy($('auth-submit'), async function () {
        var data = mode === 'up'
          ? await window.CloudSync.signUpEmail(email, pass)
          : await window.CloudSync.signInEmail(email, pass);
        if (mode === 'up' && data && data.user && !data.session) {
          alertBox('Check your email to confirm your account, then sign in.', 'ok');
          setMode('in');
          return;
        }
        location.replace('home.html');
      });
    });

    $('auth-magic').addEventListener('click', function () {
      var email = $('auth-email').value.trim();
      if (!email) { alertBox('Enter your email first.'); return; }
      withBusy(this, async function () {
        await window.CloudSync.signInMagic(email);
        alertBox('Magic link sent. Check your inbox.', 'ok');
      });
    });

    $('auth-google').addEventListener('click', function () {
      withBusy(this, async function () { await window.CloudSync.signInGoogle(); });
    });

    $('auth-forgot').addEventListener('click', function () {
      var email = $('auth-email').value.trim();
      if (!email) { alertBox('Enter your email first.'); return; }
      withBusy(this, async function () {
        await window.CloudSync.resetPassword(email);
        alertBox('Password reset email sent.', 'ok');
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
