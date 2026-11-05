(function() {
  'use strict';

  window.AITutorUtils = {
    // XSS-Safe text rendering: creates a text node, never uses innerHTML for user/LLM data
    createTextElement: function(tagName, text, className = '') {
      const el = document.createElement(tagName);
      if (className) el.className = className;
      el.textContent = text || '';
      return el;
    },

    // Debounce function to prevent rapid-fire API calls
    debounce: function(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    // Generate a simple UUID for guest sessions
    generateGuestId: function() {
      return 'guest_' + Math.random().toString(36).substring(2, 15);
    }
  };
})();
