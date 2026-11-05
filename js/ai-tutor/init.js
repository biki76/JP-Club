(function() {
  'use strict';

  let retries = 0;
  const MAX_RETRIES = 20; // Wait up to 10 seconds (20 * 500ms)

  function initAITutor() {
    // Check if Supabase client is fully loaded
    if (!window.supabase || !window.supabase.auth) {
      if (retries < MAX_RETRIES) {
        console.warn(`AI Tutor init delayed (${retries + 1}/${MAX_RETRIES}): Waiting for window.supabase...`);
        retries++;
        setTimeout(initAITutor, 500);
      } else {
        console.error('AI Tutor init FAILED: window.supabase did not load within 10 seconds.');
      }
      return;
    }

    // Check if CloudSync/Auth wrapper is ready
    if (!window.CloudSync) {
      if (retries < MAX_RETRIES) {
        console.warn(`AI Tutor init delayed (${retries + 1}/${MAX_RETRIES}): Waiting for window.CloudSync...`);
        retries++;
        setTimeout(initAITutor, 500);
      } else {
        console.error('AI Tutor init FAILED: window.CloudSync did not load within 10 seconds.');
      }
      return;
    }

    console.log('✅ AI Tutor initialized successfully.');
    if (window.AITutorWidget) {
      try {
        window.AITutorWidget.init();
      } catch (e) {
        console.error('Error during AI Tutor widget initialization:', e);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAITutor);
  } else {
    initAITutor();
  }
})();
