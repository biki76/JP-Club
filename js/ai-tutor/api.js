(function() {
  'use strict';

  const SUPABASE_URL = window.SUPABASE_CONFIG?.url;
  const SUPABASE_KEY = window.SUPABASE_CONFIG?.publishableKey;

  async function getAuthToken() {
    const user = window.CloudSync?.getUser();
    if (!user) throw new Error('Authentication required');
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) throw new Error('Session expired');
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
    if (!result.success) throw new Error(result.error || 'Request failed');
    return result.data;
  }

  window.AITutorAPI = {
    sendMessage: (message, level, sessionId) => callEdgeFunction('send_message', { message, level, sessionId }),
    createSession: (level) => callEdgeFunction('create_session', { level }),
    getSessions: () => callEdgeFunction('get_sessions', {}),
    getHistory: (sessionId) => callEdgeFunction('get_history', { sessionId }),
    updateProfile: (level) => callEdgeFunction('update_profile', { level }),
    isAuthenticated: () => !!window.CloudSync?.getUser()
  };
})();
