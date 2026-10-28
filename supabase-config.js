/* Phase 12 — reference template for js/supabase-config.js.
 * DO NOT edit js/supabase-config.js by hand. Generate it:
 *   node --env-file=.env scripts/gen-config.mjs
 * Or copy this shape and fill in real values.
 *
 * The publishable key is public — RLS enforces authorization server-side.
 * Never put the service_role / secret key here.
 */
window.SUPABASE_CONFIG = {
  url:            'https://ojphbocroiqgbgzxrmwx.supabase.co',
  anonKey:        'sb_publishable_fgYoBJB4JtJXsxhNn0oJKQ_RrKBtxot',   // legacy field — cloud.js reads this
  publishableKey: 'sb_publishable_fgYoBJB4JtJXsxhNn0oJKQ_RrKBtxot',   // new format, same value
  jwksUrl:        'https://ojphbocroiqgbgzxrmwx.supabase.co/auth/v1/.well-known/jwks.json',
  redirectTo:     new URL('auth-callback.html', window.location.href).href,
  providers:      { password: true, magicLink: true, google: true }
};
