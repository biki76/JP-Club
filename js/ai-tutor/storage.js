(function() {
  'use strict';
  const PREFS_KEY = 'ai_tutor_prefs';
  window.AITutorStorage = {
    getPrefs: function() {
      try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch(e) { return {}; }
    },
    savePrefs: function(prefs) {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    },
    getLevel: function() { return this.getPrefs().level || 'N5'; },
    setLevel: function(level) {
      const prefs = this.getPrefs();
      prefs.level = level;
      this.savePrefs(prefs);
    },
    getLastSessionId: function() { return this.getPrefs().lastSessionId || null; },
    setLastSessionId: function(id) {
      const prefs = this.getPrefs();
      prefs.lastSessionId = id;
      this.savePrefs(prefs);
    },
    getHistorySessions: function() { return this.getPrefs().sessions || []; },
    setHistorySessions: function(sessions) {
      const prefs = this.getPrefs();
      prefs.sessions = sessions;
      this.savePrefs(prefs);
    }
  };
})();
