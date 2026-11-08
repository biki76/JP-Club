/* auth-ui.js — Phase 12 (extended): multi-step signup + Facebook/Google OAuth */
(function () {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  function msg(text, kind = 'info') {
    const forms = $$('#form-signin, #form-signup');
    forms.forEach(f => {
      const p = $('.auth-msg', f);
      if (!p) return;
      p.textContent = text;
      p.dataset.kind = kind;
    });
  }

  function clearMsg() { msg(''); }

  /* ---------- Tabs ---------- */
  const tabs = $$('.auth-tabs [role=tab]');
  const forms = { signin: $('#form-signin'), signup: $('#form-signup') };

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      const which = btn.dataset.tab;
      Object.entries(forms).forEach(([k, f]) => {
        f.classList.toggle('auth-form--hidden', k !== which);
      });
      clearMsg();
    });
  });

  /* ---------- Social OAuth ---------- */
  async function signInWith(provider) {
    if (!window.supabase) { msg('Auth SDK not loaded.', 'error'); return; }
    const { error } = await window.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + '/auth-callback.html',
        queryParams: provider === 'facebook' ? { auth_type: 'rerequest' } : {}
      }
    });
    if (error) msg(error.message, 'error');
    // On success Supabase redirects away — no further UI work needed.
  }

  $$('.auth-social-btn').forEach(btn => {
    btn.addEventListener('click', () => signInWith(btn.dataset.provider));
  });

  /* ---------- Magic link ---------- */
  $('#btn-magic').addEventListener('click', async () => {
    const email = $('#form-signin [name=email]').value.trim();
    if (!email) { msg('Enter your email first.', 'error'); return; }
    const { error } = await window.supabase.auth.signInWithOtp({ email });
    msg(error ? error.message : 'Magic link sent — check your inbox.', error ? 'error' : 'info');
  });

  /* ---------- Sign in (email/password) ---------- */
  $('#form-signin').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMsg();
    const fd = new FormData(e.currentTarget);
    const { error } = await window.supabase.auth.signInWithPassword({
      email: fd.get('email'), password: fd.get('password')
    });
    if (error) { msg(error.message, 'error'); return; }
    msg('Signed in. Redirecting…', 'info');
    setTimeout(() => { window.location.href = '/home.html'; }, 600);
  });

  /* ---------- Multi-step signup ---------- */
  const signupForm = $('#form-signup');
  const steps = $$('.auth-step');
  const panes = $$('.auth-step-pane');
  const btnNext = $('.auth-next', signupForm);
  const btnBack = $('.auth-back', signupForm);
  const btnSubmit = $('button[type=submit]', signupForm);
  let current = 1;
  const total = 3;

  function renderSteps() {
    steps.forEach((s, i) => s.classList.toggle('is-active', i + 1 === current));
    panes.forEach(p => p.classList.toggle('auth-step-pane--hidden', +p.dataset.pane !== current));
    btnBack.classList.toggle('auth-step-nav--hidden', current === 1);
    btnNext.classList.toggle('auth-step-nav--hidden', current === total);
    btnSubmit.classList.toggle('auth-step-nav--hidden', current !== total);
  }

  function validatePane(n) {
    const pane = $(`.auth-step-pane[data-pane="${n}"]`, signupForm);
    const required = $$('[required]', pane);
    for (const el of required) {
      if (!el.value.trim()) { el.reportValidity(); el.focus(); return false; }
    }
    if (n === 1) {
      const p1 = signupForm.password.value, p2 = signupForm.password2.value;
      if (p1 !== p2) { msg('Passwords do not match.', 'error'); signupForm.password2.focus(); return false; }
    }
    return true;
  }

  btnNext.addEventListener('click', () => {
    if (!validatePane(current)) return;
    if (current < total) { current++; renderSteps(); clearMsg(); }
  });
  btnBack.addEventListener('click', () => {
    if (current > 1) { current--; renderSteps(); clearMsg(); }
  });
  renderSteps();

  /* ---------- Submit signup ---------- */
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMsg();
    if (!validatePane(current)) return;

    const fd = new FormData(signupForm);
    const email = fd.get('email');
    const password = fd.get('password');

    const { data, error } = await window.supabase.auth.signUp({
      email, password,
      options: {
        data: {
          display_name: fd.get('display_name'),
          date_of_birth: fd.get('date_of_birth'),
          gender: fd.get('gender'),
          nihongo_level: fd.get('nihongo_level'),
          learning_goal: fd.get('learning_goal')
        }
      }
    });

    if (error) { msg(error.message, 'error'); return; }

    // Also write to profiles table (trigger handles creation; we update)
    if (data.user) {
      const { error: profErr } = await window.supabase
        .from('profiles').upsert({
          id: data.user.id,
          email,
          display_name: fd.get('display_name'),
          date_of_birth: fd.get('date_of_birth'),
          gender: fd.get('gender'),
          nihongo_level: fd.get('nihongo_level'),
          learning_goal: fd.get('learning_goal'),
          updated_at: new Date().toISOString()
        });
      if (profErr) console.warn('profile upsert', profErr);
    }

    msg('Account created. Check your email to confirm, then sign in.', 'info');
    // Switch to sign-in tab after short delay
    setTimeout(() => {
      tabs[0].click();
      signupForm.reset();
      current = 1; renderSteps();
    }, 2500);
  });
})();
