(function() {
  'use strict';
  function initAITutor() {
    if (!window.CloudSync || !window.supabase) {
      setTimeout(initAITutor, 100);
      return;
    }
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
