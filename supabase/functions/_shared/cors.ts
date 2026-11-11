const ALLOWED_ORIGINS = new Set([
  'https://biki76.github.io',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5500',
  'http://localhost:8080'
]);

export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://biki76.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
};

export function getDynamicCorsHeaders(req?: Request): Record<string, string> {
  if (!req) return corsHeaders;
  const origin = req.headers.get('origin') || '';
  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin)
      ? origin
      : 'https://biki76.github.io'
  };
}
