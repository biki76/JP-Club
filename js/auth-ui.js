/* auth-ui.js — Auth page UI handlers */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
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

  function setLoading(button, loading) {
    if (!button) return;
    if (loading) {
      button.classList.add('loading');
      button.disabled = true;
    } else {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  // Wait for Supabase to be ready
  function waitForSupabase(callback) {
    if (window.supabase && typeof window.supabase.auth !== 'undefined') {
      callback();
    } else {
      console.log('Waiting for Supabase...');
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.supabase && typeof window.supabase.auth !== 'undefined') {
          clearInterval(interval);
          callback();
        } else if (attempts > 50) {
          clearInterval(interval);
          msg('Authentication service unavailable. Please refresh.', 'error');
        }
      }, 100);
    }
  }

  // Tabs
  const tabs = $$('.auth-tabs [role=tab]');
  const forms = { signin: $('#form-signin'), signup: $('#form-signup') };

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      const which = btn.dataset.tab;
      Object.entries(forms).forEach(([k, f]) => {
        if (f) f.classList.toggle('auth-form--hidden', k !== which);
      });
      clearMsg();
    });
  });

  // Social OAuth
  function signInWith(provider) {
    waitForSupabase(() => {
      msg(`Redirecting to ${provider}...`, 'info');
      
      window.supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: new URL('auth-callback.html', window.location.href).href,
          queryParams: provider === 'facebook' ? { auth_type: 'rerequest' } : {}
        }
      }).then(({ error }) => {
        if (error) {
          msg(error.message, 'error');
          console.error('OAuth error:', error);
        }
      }).catch(err => {
        msg('Authentication failed: ' + err.message, 'error');
        console.error('OAuth error:', err);
      });
    });
  }

  $$('.auth-social-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const provider = btn.dataset.provider;
      console.log('Clicking provider:', provider);
      signInWith(provider);
    });
  });

  // Magic link
  const btnMagic = $('#btn-magic');
  if (btnMagic) {
    btnMagic.addEventListener('click', (e) => {
      e.preventDefault();
      const emailInput = $('#form-signin [name=email]');
      const email = emailInput ? emailInput.value.trim() : '';
      
      if (!email) { 
        msg('Please enter your email first.', 'error'); 
        if (emailInput) emailInput.focus();
        return; 
      }

      waitForSupabase(() => {
        setLoading(btnMagic, true);
        msg('Sending magic link...', 'info');
        
        window.supabase.auth.signInWithOtp({ 
          email: email 
        }).then(({ error }) => {
          setLoading(btnMagic, false);
          if (error) {
            msg(error.message, 'error');
          } else {
            msg('Magic link sent! Check your email.', 'success');
          }
        }).catch(err => {
          setLoading(btnMagic, false);
          msg('Failed to send magic link: ' + err.message, 'error');
        });
      });
    });
  }

  // Sign in
  const formSignin = $('#form-signin');
  if (formSignin) {
    formSignin.addEventListener('submit', (e) => {
      e.preventDefault();
      clearMsg();
      
      const fd = new FormData(e.currentTarget);
      const email = fd.get('email');
      const password = fd.get('password');
      const submitBtn = e.currentTarget.querySelector('button[type=submit]');

      if (!email || !password) {
        msg('Please fill in all fields.', 'error');
        return;
      }

      waitForSupabase(() => {
        setLoading(submitBtn, true);
        msg('Signing in...', 'info');
        
        window.supabase.auth.signInWithPassword({
          email: email,
          password: password
        }).then(({ error }) => {
          setLoading(submitBtn, false);
          if (error) {
            msg(error.message, 'error');
          } else {
            msg('Signed in successfully! Redirecting...', 'success');
            setTimeout(() => { 
              window.location.href = new URL('home.html', window.location.href).href; 
            }, 800);
          }
        }).catch(err => {
          setLoading(submitBtn, false);
          msg('Sign in failed: ' + err.message, 'error');
        });
      });
    });
  }

  // Multi-step signup
  const signupForm = $('#form-signup');
  if (signupForm) {
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
      if (btnBack) btnBack.classList.toggle('auth-step-nav--hidden', current === 1);
      if (btnNext) btnNext.classList.toggle('auth-step-nav--hidden', current === total);
      if (btnSubmit) btnSubmit.classList.toggle('auth-step-nav--hidden', current !== total);
    }

    function validatePane(n) {
      const pane = $(`.auth-step-pane[data-pane="${n}"]`, signupForm);
      if (!pane) return true;
      
      const required = $$('[required]', pane);
      for (const el of required) {
        if (!el.value.trim()) { 
          el.reportValidity(); 
          el.focus(); 
          return false; 
        }
      }
      
      if (n === 1) {
        const p1 = signupForm.password.value;
        const p2 = signupForm.password2.value;
        if (p1 !== p2) { 
          msg('Passwords do not match.', 'error'); 
          signupForm.password2.focus(); 
          return false; 
        }
      }
      return true;
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (!validatePane(current)) return;
        if (current < total) { 
          current++; 
          renderSteps(); 
          clearMsg(); 
        }
      });
    }

    if (btnBack) {
      btnBack.addEventListener('click', () => {
        if (current > 1) { 
          current--; 
          renderSteps(); 
          clearMsg(); 
        }
      });
    }

    renderSteps();

    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearMsg();
      if (!validatePane(current)) return;

      const fd = new FormData(signupForm);
      const email = fd.get('email');
      const password = fd.get('password');
      const submitBtn = e.currentTarget.querySelector('button[type=submit]');

      waitForSupabase(() => {
        setLoading(submitBtn, true);
        msg('Creating account...', 'info');
        
        window.supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              display_name: fd.get('display_name'),
              date_of_birth: fd.get('date_of_birth'),
              gender: fd.get('gender'),
              nihongo_level: fd.get('nihongo_level'),
              learning_goal: fd.get('learning_goal')
            }
          }
        }).then(({ data, error }) => {
          setLoading(submitBtn, false);
          
          if (error) { 
            msg(error.message, 'error'); 
            return; 
          }

          if (data.user) {
            window.supabase
              .from('profiles')
              .upsert({
                id: data.user.id,
                email: email,
                display_name: fd.get('display_name'),
                date_of_birth: fd.get('date_of_birth'),
                gender: fd.get('gender'),
                nihongo_level: fd.get('nihongo_level'),
                learning_goal: fd.get('learning_goal'),
                updated_at: new Date().toISOString()
              })
              .then(({ error: profErr }) => {
                if (profErr) {
                  console.warn('profile upsert warning:', profErr);
                }
              });
          }

          msg('Account created! Check your email to confirm, then sign in.', 'success');
          
          setTimeout(() => {
            if (tabs[0]) tabs[0].click();
            signupForm.reset();
            current = 1; 
            renderSteps();
          }, 3000);
        }).catch(err => {
          setLoading(submitBtn, false);
          msg('Signup failed: ' + err.message, 'error');
        });
      });
    });
  }

  // Debug: Log when Supabase is ready
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (window.supabase && typeof window.supabase.auth !== 'undefined') {
        console.log('✓ Supabase ready for auth');
      } else {
        console.warn('⚠ Supabase not ready after load');
      }
    }, 500);
  });
})();
