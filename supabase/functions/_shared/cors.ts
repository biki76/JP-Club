// _shared/cors.ts — origin allow-list instead of `Access-Control-Allow-Origin: *`.
// Configure with:  supabase secrets set ALLOWED_ORIGINS="https://biki76.github.io,http://localhost:8000"
// (An origin is scheme+host+port only — no path. The Pages project path /JP-Club/ is NOT part of it.)

const DEFAULTS = ['https://biki76.github.io', 'http://localhost:8000', 'http://127.0.0.1:8000'];

export function allowedOrigins(raw: string | undefined | null): string[] {
  const list = (raw || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
  return list.length ? list : DEFAULTS;
}

export function isAllowed(origin: string | null, allowed: string[]): boolean {
  return !!origin && allowed.includes(origin);
}

export function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const h: Record<string, string> = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Expose-Headers': 'Retry-After',
    'Access-Control-Max-Age': '86400',
  };
  if (isAllowed(origin, allowed)) h['Access-Control-Allow-Origin'] = origin as string;
  return h;
}
