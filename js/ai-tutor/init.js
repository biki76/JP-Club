(function() {
  'use strict';

  function initAITutor() {
    if (!window.supabase || !window.CloudSync) {
      console.warn('AI Tutor init delayed: Supabase or CloudSync not ready.');
      setTimeout(initAITutor, 500);
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
