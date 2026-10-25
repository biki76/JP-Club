/* Phase 12 — reference template. Do not edit js/supabase-config.js by hand.
 * Copy this file's shape OR run `node --env-file=.env scripts/gen-config.mjs`.
 */
window.SUPABASE_CONFIG = {
  url:            'https://YOUR-PROJECT.supabase.co',
  anonKey:        'sb_publishable_xxxxxxxxxxxxxxxxxxxx',   // legacy field
  publishableKey: 'sb_publishable_xxxxxxxxxxxxxxxxxxxx',   // new field, same value
  jwksUrl:        'https://YOUR-PROJECT.supabase.co/auth/v1/.well-known/jwks.json',
  redirectTo:     window.location.origin + '/auth-callback.html',
  providers:      { password: true, magicLink: true, google: true }
};
