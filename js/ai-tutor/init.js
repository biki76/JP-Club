(function() {
  'use strict';

  function initAITutor() {
    // Wait for BOTH CloudSync AND the Supabase global object to be ready
    if (!window.supabase || !window.CloudSync) {
      console.warn('AI Tutor init delayed: Waiting for Supabase/CloudSync...');
      setTimeout(initAITutor, 500);
      return;
    }

    // Double-check that supabase.auth exists (prevents the 'getSession' crash)
    if (!window.supabase.auth) {
      console.error('AI Tutor init failed: window.supabase.auth is missing.');
      return;
    }

    console.log('Initializing AI Tutor...');
    if (window.AITutorWidget) {
      window.AITutorWidget.init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAITutor);
  } else {
    initAITutor();
  }
})();
