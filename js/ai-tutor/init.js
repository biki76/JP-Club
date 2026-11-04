/* AI Tutor Initialization */
(function() {
  'use strict';

  function initAITutor() {
    // Wait for dependencies
    if (!window.CloudSync || !window.supabase) {
      setTimeout(initAITutor, 100);
      return;
    }

    // Initialize widget
    if (window.AITutorWidget) {
      window.AITutorWidget.init();
      console.log('AI Tutor initialized');
    }
  }

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAITutor);
  } else {
    initAITutor();
  }
})();
