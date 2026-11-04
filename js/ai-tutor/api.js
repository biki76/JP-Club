(function() {
  'use strict';

  const SUPABASE_URL = window.SUPABASE_CONFIG?.url;
  const SUPABASE_KEY = window.SUPABASE_CONFIG?.publishableKey;

  async function getAuthToken() {
    // Wait for Supabase to be available
    if (!window.supabase) {
      throw new Error('Supabase not loaded yet. Please wait a moment and try again.');
    }

    const user = window.CloudSync?.getUser();
    if (!user) {
      throw new Error('Authentication required. Please sign in to use AI Tutor.');
    }
    
    // Get fresh session with retry logic
    try {
      const { data: { session }, error } = await window.supabase.auth.getSession();
      if (error || !session) {
        throw new Error('Session expired. Please sign in again.');
      }
      return session.access_token;
    } catch (err) {
      console.error('Auth error:', err);
      throw new Error('Authentication failed. Please refresh the page and try again.');
    }
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
      } catch (e) {
        // Use default error message
      }
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
