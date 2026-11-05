(function() {
  'use strict';

  const SUPABASE_URL = window.SUPABASE_CONFIG?.url;
  const SUPABASE_KEY = window.SUPABASE_CONFIG?.publishableKey;

  async function getAuthToken() {
    var client = window.__sb || (window.CloudSync && window.CloudSync.client);
    for (var i = 0; i < 20 && !(client && client.auth); i++) {
      await new Promise(function (r) { setTimeout(r, 150); });
      client = window.__sb || (window.CloudSync && window.CloudSync.client);
    }
    if (!client || !client.auth) throw new Error('Supabase client not ready. Please refresh the page.');
    var res = await client.auth.getSession();
    if (res.error || !res.data || !res.data.session) throw new Error('Please sign in to use AI Tutor.');
    return res.data.session.access_token;
  }

  async function callEdgeFunction(action, payload) {
    const token = await getAuthToken();
    
    if (!SUPABASE_URL) {
      throw new Error('Supabase URL not configured');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-tutor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY || ''
      },
      body: JSON.stringify({ action, ...payload })
    });

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
      } catch (e) { /* Use default error message */ }
      throw new Error(errorMsg);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Request failed');
    }

    return result.data;
  }

  window.AITutorAPI = {
    sendMessage: async function(message, level, sessionId) {
      return await callEdgeFunction('send_message', { message, level, sessionId });
    },
    createSession: async function(level) {
      return await callEdgeFunction('create_session', { level });
    },
    getSessions: async function() {
      return await callEdgeFunction('get_sessions', {});
    },
    getHistory: async function(sessionId) {
      return await callEdgeFunction('get_history', { sessionId });
    },
    updateProfile: async function(level) {
      return await callEdgeFunction('update_profile', { level });
    },
    isAuthenticated: function() {
      return !!window.CloudSync?.getUser();
    }
  };
})();
