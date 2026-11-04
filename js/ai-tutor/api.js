/* AI Tutor API Communication */
(function() {
  'use strict';

  const SUPABASE_URL = window.SUPABASE_CONFIG?.url;
  const SUPABASE_KEY = window.SUPABASE_CONFIG?.publishableKey;

  async function getAuthToken() {
    const user = window.CloudSync?.getUser();
    if (!user) {
      throw new Error('Authentication required. Please sign in to use AI Tutor.');
    }
    
    // Get fresh session
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
      throw new Error('Session expired. Please sign in again.');
    }
    
    return session.access_token;
  }

  async function callEdgeFunction(action, payload) {
    const token = await getAuthToken();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-tutor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({ action, ...payload })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Request failed');
    }

    return result.data;
  }

  window.AITutorAPI = {
    sendMessage: async function(message, level, sessionId) {
      return await callEdgeFunction('send_message', {
        message,
        level,
        sessionId
      });
    },

    createSession: async function(level) {
      return await callEdgeFunction('create_session', { level });
    },

    getSessions: async function() {
      return await callEdgeFunction('get_sessions', {});
    },

    isAuthenticated: function() {
      return !!window.CloudSync?.getUser();
    }
  };
})();
