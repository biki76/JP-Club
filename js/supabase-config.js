/* supabase-config.js — Initialize Supabase client */
(function() {
  'use strict';

  // Replace with your actual Supabase credentials
  const SUPABASE_URL = 'https://ojphbocroiqgbgzxrmwx.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_fgYoBJB4JtJXsxhNn0oJKQ_RrKBtxot';

  // Wait for Supabase SDK to load
  function initSupabase() {
    window.SUPABASE_CONFIG = { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
    if (window.supabase && window.supabase.auth) return true;
    if (typeof window.supabase === 'undefined') {
      console.error('Supabase SDK not loaded');
      return false;
    }

    // Create Supabase client
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Attach to window for global access
    window.supabase = supabaseClient;
    
    console.log('Supabase client initialized');
    return true;
  }

  // Try to initialize immediately
  if (!initSupabase()) {
    // If SDK not loaded yet, wait for it
    window.addEventListener('load', () => {
      setTimeout(() => {
        if (!initSupabase()) {
          console.error('Failed to initialize Supabase after load');
        }
      }, 100);
    });
  }
})();
