const DEFAULT_ORIGINS = [
  'https://biki76.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:3000',
  'http://localhost:5173',
];

export function allowedOrigins(envRaw?: string): string[] {
  const raw =
    envRaw ??
    (typeof Deno !== 'undefined' && Deno.env?.get ? Deno.env.get('ALLOWED_ORIGINS') : undefined) ??
    (typeof process !== 'undefined' && process.env ? process.env.ALLOWED_ORIGINS : undefined) ??
    '';
  const list = raw
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return list.length > 0 ? list : DEFAULT_ORIGINS;
}

export function isAllowed(origin: string | null | undefined, allowList?: string[]): boolean {
  if (!origin) return false;
  const clean = origin.trim().replace(/\/+$/, '');
  const list = allowList && allowList.length > 0 ? allowList : allowedOrigins();
  if (list.includes('*')) return true;
  return list.includes(clean);
}

export function corsHeaders(origin?: string | null, allowList?: string[]): Record<string, string> {
  const list = allowList && allowList.length > 0 ? allowList : allowedOrigins();
  const clean = origin ? origin.trim().replace(/\/+$/, '') : '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (clean && isAllowed(clean, list)) {
    headers['Access-Control-Allow-Origin'] = clean;
  }
  return headers;
}
