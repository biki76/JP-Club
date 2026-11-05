(function() {
  'use strict';

  const STORAGE_KEYS = {
    LEVEL: 'ai_tutor_jlpt_level',
    SESSION_ID: 'ai_tutor_current_session_id',
    GUEST_HISTORY: 'ai_tutor_guest_history',
    AUTO_SPEAK: 'ai_tutor_auto_speak'
  };

  window.AITutorStorage = {
    getLevel: function() {
      try { return localStorage.getItem(STORAGE_KEYS.LEVEL) || 'N5'; } catch (e) { return 'N5'; }
    },
    setLevel: function(level) {
      try { localStorage.setItem(STORAGE_KEYS.LEVEL, level); } catch (e) {}
    },
    getLastSessionId: function() {
      try { return localStorage.getItem(STORAGE_KEYS.SESSION_ID); } catch (e) { return null; }
    },
    setLastSessionId: function(sessionId) {
      try {
        if (sessionId) localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
        else localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
      } catch (e) {}
    },
    getAutoSpeak: function() {
      try { return localStorage.getItem(STORAGE_KEYS.AUTO_SPEAK) === 'true'; } catch (e) { return false; }
    },
    setAutoSpeak: function(enabled) {
      try { localStorage.setItem(STORAGE_KEYS.AUTO_SPEAK, enabled ? 'true' : 'false'); } catch (e) {}
    },
    saveGuestMessage: function(messageObj) {
      try {
        const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.GUEST_HISTORY) || '[]');
        history.push(messageObj);
        if (history.length > 20) history.shift();
        localStorage.setItem(STORAGE_KEYS.GUEST_HISTORY, JSON.stringify(history));
      } catch (e) {}
    },
    getGuestHistory: function() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.GUEST_HISTORY) || '[]'); } catch (e) { return []; }
    },
    clearGuestHistory: function() {
      try { localStorage.removeItem(STORAGE_KEYS.GUEST_HISTORY); } catch (e) {}
    }
  };
})();
