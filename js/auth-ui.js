/* auth-ui.js — Auth page handlers (hardened).
 * Requires: js/security/sanitize.js + js/security/jp-auth.js (load before this file).
 *
 * Changes vs the previous version:
 *  - one shared client (JPAuth) with PKCE; no more window.supabase clobbering
 *  - base-path-safe redirects (works under /JP-Club/ on GitHub Pages)
 *  - validated + length-capped inputs, open-redirect-safe ?next=
 *  - client-side cooldown / lockout on repeated failures
 *  - profile row is created by a DB trigger (sql/hardening.sql), not by the browser
 */
(function () {
  'use strict';

  var S = window.Sanitize, A = window.JPAuth;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var LEVELS = ['absolute_beginner', 'n5', 'n4', 'n3', 'n2', 'n1'];
  var GENDERS = ['male', 'female', 'non_binary', 'prefer_not_to_say'];
  var PROVIDERS = ['google', 'facebook'];
  var NEXT_KEY = 'jp_auth_next';

  var T = {
    fill:      ['Please fill in all fields.', 'সব ঘর পূরণ করুন।'],
    email:     ['Enter a valid email address.', 'সঠিক ইমেইল দিন।'],
    pwShort:   ['Password must be at least 8 characters.', 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।'],
    pwLong:    ['Password must be at most 72 characters.', 'পাসওয়ার্ড সর্বোচ্চ ৭২ অক্ষরের হতে পারে।'],
    pwWeak:    ['Choose a less repetitive password.', 'আরও শক্ত পাসওয়ার্ড দিন।'],
    pwMatch:   ['Passwords do not match.', 'পাসওয়ার্ড মিলছে না।'],
    name:      ['Use letters, numbers and spaces only (max 40).', 'শুধু অক্ষর, সংখ্যা ও স্পেস (সর্বোচ্চ ৪০)।'],
    dob:       ['Enter a valid date of birth.', 'সঠিক জন্মতারিখ দিন।'],
    wait:      ['Too many attempts. Try again in a moment.', 'অনেকবার চেষ্টা হয়েছে। একটু পরে আবার চেষ্টা করুন।'],
    bad:       ['Email or password is incorrect.', 'ইমেইল বা পাসওয়ার্ড ভুল।'],
    net:       ['Network problem. Check your connection and retry.', 'নেটওয়ার্ক সমস্যা। সংযোগ দেখে আবার চেষ্টা করুন।'],
    unavail:   ['Sign-in service unavailable. Please refresh.', 'সাইন-ইন সেবা পাওয়া যাচ্ছে না। রিফ্রেশ করুন।'],
    generic:   ['Something went wrong. Please try again.', 'কিছু ভুল হয়েছে। আবার চেষ্টা করুন।'],
    sending:   ['Sending…', 'পাঠানো হচ্ছে…'],
    magicOk:   ['If that address can sign in, a link is on its way.', 'ঠিকানাটি বৈধ হলে লিঙ্ক পাঠানো হয়েছে।'],
    signing:   ['Signing in…', 'সাইন ইন হচ্ছে…'],
    signedIn:  ['Signed in. Redirecting…', 'সাইন ইন হয়েছে। রিডাইরেক্ট হচ্ছে…'],
    creating:  ['Creating account…', 'অ্যাকাউন্ট তৈরি হচ্ছে…'],
    created:   ['Check your email to confirm your account, then sign in.', 'ইমেইল নিশ্চিত করে তারপর সাইন ইন করুন।'],
    redirect:  ['Redirecting…', 'রিডাইরেক্ট হচ্ছে…']
  };
  function L(key) {
    var bn = document.documentElement.lang === 'bn';
    return (T[key] || T.generic)[bn ? 1 : 0];
  }

  /* ---------- UI helpers ---------- */
  function msg(text, kind) {
    $$('#form-signin .auth-msg, #form-signup .auth-msg').forEach(function (p) {
      p.textContent = text || '';
      p.dataset.kind = kind || 'info';
    });
  }
  function busy(btn, on) {
    if (!btn) return;
    btn.classList.toggle('loading', !!on);
    btn.disabled = !!on;
  }

  /* ---------- throttle: 1.5 s between submits, 30 s lockout after 5 failures ---------- */
  var GUARD_KEY = 'jp_auth_guard';
  function guardState() {
    try { return JSON.parse(sessionStorage.getItem(GUARD_KEY) || '{}'); } catch (e) { return {}; }
  }
  function guardSave(g) { try { sessionStorage.setItem(GUARD_KEY, JSON.stringify(g)); } catch (e) {} }
  function guardOk() {
    var g = guardState(), now = Date.now();
    if (g.until && now < g.until) return false;
    if (g.last && now - g.last < 1500) return false;
    g.last = now; guardSave(g);
    return true;
  }
  function guardFail() {
    var g = guardState();
    g.fails = (g.fails || 0) + 1;
    if (g.fails >= 5) { g.until = Date.now() + 30000; g.fails = 0; }
    guardSave(g);
  }
  function guardReset() { guardSave({}); }

  /* Map server errors to generic, non-enumerating messages. */
  function explain(err) {
    if (!err) return L('generic');
    var m = String(err.message || '');
    if (/invalid login|invalid credentials|email not confirmed/i.test(m)) return L('bad');
    if (/rate limit|too many|over_/i.test(m) || err.status === 429) return L('wait');
    if (/fetch|network|failed to/i.test(m) || err.status === 0) return L('net');
    return L('generic');
  }

  /* ---------- next / redirect ---------- */
  var qsNext = new URLSearchParams(location.search).get('next');
  if (qsNext) { try { sessionStorage.setItem(NEXT_KEY, S.safeNext(qsNext)); } catch (e) {} }
  function nextUrl() {
    var n = 'home.html';
    try { n = S.safeNext(sessionStorage.getItem(NEXT_KEY), 'home.html'); } catch (e) {}
    return S.appUrl(n);
  }
  function callbackUrl() { return S.appUrl('auth-callback.html'); }

  /* ---------- client readiness ---------- */
  function withClient(fn) {
    A.ready(8000).then(fn).catch(function () { msg(L('unavail'), 'error'); });
  }

  /* ---------- tabs ---------- */
  var tabs = $$('.auth-tabs [role=tab]');
  var forms = { signin: $('#form-signin'), signup: $('#form-signup') };
  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabs.forEach(function (b) { b.setAttribute('aria-selected', 'false'); });
      btn.setAttribute('aria-selected', 'true');
      Object.keys(forms).forEach(function (k) {
        if (forms[k]) forms[k].classList.toggle('auth-form--hidden', k !== btn.dataset.tab);
      });
      msg('');
    });
  });

  /* ---------- social OAuth ---------- */
  $$('.auth-social-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var provider = S.oneOf(btn.dataset.provider, PROVIDERS, '');
      if (!provider || !guardOk()) { if (!provider) msg(L('generic'), 'error'); else msg(L('wait'), 'error'); return; }
      withClient(function (c) {
        msg(L('redirect'), 'info');
        c.auth.signInWithOAuth({ provider: provider, options: { redirectTo: callbackUrl() } })
          .then(function (r) { if (r.error) msg(explain(r.error), 'error'); })
          .catch(function (err) { msg(explain(err), 'error'); });
      });
    });
  });

  /* ---------- magic link ---------- */
  var btnMagic = $('#btn-magic');
  if (btnMagic) {
    btnMagic.addEventListener('click', function (e) {
      e.preventDefault();
      var input = $('#form-signin [name=email]');
      var email = S.email(input ? input.value : '');
      if (!email) { msg(L('email'), 'error'); if (input) input.focus(); return; }
      if (!guardOk()) { msg(L('wait'), 'error'); return; }
      withClient(function (c) {
        busy(btnMagic, true); msg(L('sending'), 'info');
        c.auth.signInWithOtp({ email: email, options: { emailRedirectTo: callbackUrl() } })
          .then(function (r) {
            busy(btnMagic, false);
            // Same message on success and "unknown address": no account enumeration.
            if (r.error && !/not found|signups? not allowed/i.test(r.error.message || '')) msg(explain(r.error), 'error');
            else msg(L('magicOk'), 'success');
          })
          .catch(function (err) { busy(btnMagic, false); msg(explain(err), 'error'); });
      });
    });
  }

  /* ---------- sign in ---------- */
  var formSignin = forms.signin;
  if (formSignin) {
    formSignin.addEventListener('submit', function (e) {
      e.preventDefault(); msg('');
      var fd = new FormData(formSignin);
      var email = S.email(fd.get('email'));
      var password = String(fd.get('password') || '');
      var btn = formSignin.querySelector('button[type=submit]');
      if (!email || !password) { msg(email ? L('fill') : L('email'), 'error'); return; }
      if (password.length > 72) { msg(L('bad'), 'error'); return; }
      if (!guardOk()) { msg(L('wait'), 'error'); return; }
      withClient(function (c) {
        busy(btn, true); msg(L('signing'), 'info');
        c.auth.signInWithPassword({ email: email, password: password })
          .then(function (r) {
            busy(btn, false);
            if (r.error) { guardFail(); msg(explain(r.error), 'error'); return; }
            guardReset(); msg(L('signedIn'), 'success');
            setTimeout(function () { location.replace(nextUrl()); }, 400);
          })
          .catch(function (err) { busy(btn, false); guardFail(); msg(explain(err), 'error'); });
      });
    });
  }

  /* ---------- sign up (3 steps) ---------- */
  var signupForm = forms.signup;
  if (signupForm) {
    var steps = $$('.auth-step'), panes = $$('.auth-step-pane');
    var btnNext = $('.auth-next', signupForm), btnBack = $('.auth-back', signupForm);
    var btnSubmit = $('button[type=submit]', signupForm);
    var current = 1, total = 3;

    function render() {
      steps.forEach(function (s, i) { s.classList.toggle('is-active', i + 1 === current); });
      panes.forEach(function (p) { p.classList.toggle('auth-step-pane--hidden', +p.dataset.pane !== current); });
      if (btnBack) btnBack.classList.toggle('auth-step-nav--hidden', current === 1);
      if (btnNext) btnNext.classList.toggle('auth-step-nav--hidden', current === total);
      if (btnSubmit) btnSubmit.classList.toggle('auth-step-nav--hidden', current !== total);
    }

    function validatePane(n) {
      var pane = $('.auth-step-pane[data-pane="' + n + '"]', signupForm);
      if (!pane) return true;
      var req = $$('[required]', pane);
      for (var i = 0; i < req.length; i++) {
        if (!String(req[i].value || '').trim()) { req[i].reportValidity(); req[i].focus(); return false; }
      }
      if (n === 1) {
        if (!S.email(signupForm.email.value)) { msg(L('email'), 'error'); signupForm.email.focus(); return false; }
        var issue = S.passwordIssue(signupForm.password.value);
        if (issue) { msg(L(issue === 'short' ? 'pwShort' : issue === 'long' ? 'pwLong' : 'pwWeak'), 'error'); signupForm.password.focus(); return false; }
        if (signupForm.password.value !== signupForm.password2.value) { msg(L('pwMatch'), 'error'); signupForm.password2.focus(); return false; }
      }
      if (n === 2) {
        if (!S.displayName(signupForm.display_name.value)) { msg(L('name'), 'error'); signupForm.display_name.focus(); return false; }
        if (!S.birthDate(signupForm.date_of_birth.value, 5)) { msg(L('dob'), 'error'); signupForm.date_of_birth.focus(); return false; }
      }
      return true;
    }

    if (btnNext) btnNext.addEventListener('click', function () {
      if (validatePane(current) && current < total) { current++; render(); msg(''); }
    });
    if (btnBack) btnBack.addEventListener('click', function () {
      if (current > 1) { current--; render(); msg(''); }
    });
    render();

    signupForm.addEventListener('submit', function (e) {
      e.preventDefault(); msg('');
      for (var n = 1; n <= total; n++) { if (!validatePane(n)) { current = n; render(); return; } }
      if (!guardOk()) { msg(L('wait'), 'error'); return; }

      var fd = new FormData(signupForm);
      var email = S.email(fd.get('email'));
      var password = String(fd.get('password') || '');
      // Only allow-listed, validated fields leave the browser. The DB trigger copies
      // the same allow-list into public.profiles; user_metadata is NEVER used for authz.
      var meta = {
        display_name: S.displayName(fd.get('display_name')),
        date_of_birth: S.birthDate(fd.get('date_of_birth'), 5),
        gender: S.oneOf(fd.get('gender'), GENDERS, 'prefer_not_to_say'),
        nihongo_level: S.oneOf(fd.get('nihongo_level'), LEVELS, 'absolute_beginner'),
        learning_goal: S.text(fd.get('learning_goal'), 240)
      };

      withClient(function (c) {
        busy(btnSubmit, true); msg(L('creating'), 'info');
        c.auth.signUp({ email: email, password: password, options: { data: meta, emailRedirectTo: callbackUrl() } })
          .then(function (r) {
            busy(btnSubmit, false);
            if (r.error) { guardFail(); msg(explain(r.error), 'error'); return; }
            // Identical message whether or not the address already existed.
            msg(L('created'), 'success');
            setTimeout(function () {
              if (tabs[0]) tabs[0].click();
              signupForm.reset(); current = 1; render();
            }, 3500);
          })
          .catch(function (err) { busy(btnSubmit, false); guardFail(); msg(explain(err), 'error'); });
      });
    });
  }
})();
