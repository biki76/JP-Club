// supabase/functions/voice-speak/index.ts — text-to-speech via Cloudflare Workers AI (MeloTTS).
//
// Single file on purpose: paste it into the dashboard editor (Edge Functions → voice-speak → Code).
// Secrets:  CF_ACCOUNT_ID, CF_API_TOKEN, optional ALLOWED_ORIGINS="https://biki76.github.io,http://localhost:8000"
// Keep "Verify JWT" ON.
//
// What changed vs the old version:
//  - upstream (Cloudflare) errors are logged on the server only; the browser gets a generic message + requestId
//  - CORS allow-list instead of "*"
//  - per-user rate limit (best effort, in-memory), request timeouts, input validation
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const BUILD = "s3";
const DEFAULT_ORIGINS = ["https://biki76.github.io", "http://localhost:8000", "http://127.0.0.1:8000"];
const MAX_TEXT = 300;
const PER_MINUTE = 30;          // per user, per function instance
const UPSTREAM_TIMEOUT_MS = 15_000;

function allowedOrigins(): string[] {
  const list = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
  return list.length ? list : DEFAULT_ORIGINS;
}
function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const h: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && allowedOrigins().includes(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

// best-effort limiter: instances are short-lived, so this blunts bursts, it is not a hard quota
const hits = new Map<string, number[]>();
function limited(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= PER_MINUTE) { hits.set(userId, recent); return true; }
  recent.push(now); hits.set(userId, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < 60_000)) hits.delete(k);
  return false;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const cors = corsFor(req);
  const json = (body: Record<string, unknown>, status = 200, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(status >= 400 ? { ...body, requestId } : body), {
      status,
      headers: { ...cors, ...extra, "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed.", code: "method" }, 405);
  const origin = req.headers.get("Origin");
  if (origin && !allowedOrigins().includes(origin)) return json({ error: "Origin not allowed.", code: "origin" }, 403);

  try {
    const header = req.headers.get("Authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return json({ error: "Please sign in.", code: "unauthorized" }, 401);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await sb.auth.getUser(token);
    if (!data?.user) return json({ error: "Please sign in.", code: "unauthorized" }, 401);

    if (limited(data.user.id)) return json({ error: "Too many requests. Please wait a moment.", code: "rate_limited" }, 429, { "Retry-After": "30" });

    const rawBody = await req.text();
    if (rawBody.length > 4096) return json({ error: "Request too large.", code: "too_large" }, 413);
    let body: any;
    try { body = JSON.parse(rawBody); } catch { return json({ error: "Invalid request.", code: "bad_json" }, 400); }
    const text = String(body?.text ?? "").normalize("NFC")
      .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, " ")
      .replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
    if (!text) return json({ error: "No text to speak.", code: "empty" }, 400);

    const acct = Deno.env.get("CF_ACCOUNT_ID");
    const tok = Deno.env.get("CF_API_TOKEN");
    if (!acct || !tok) {
      console.error(`[voice-speak ${requestId}] CF_ACCOUNT_ID / CF_API_TOKEN secret missing`);
      return json({ error: "Voice is unavailable right now.", code: "unavailable" }, 503);
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(acct)}/ai/run/@cf/myshell-ai/melotts`;
    let lastStatus = 0;
    for (const lang of ["jp", "ja"]) {
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text, lang }),
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
        const raw = await r.text();
        if (r.ok) {
          let audio: unknown;
          try { audio = JSON.parse(raw)?.result?.audio; } catch { /* handled below */ }
          if (typeof audio === "string" && audio) return json({ build: BUILD, audio });
          console.error(`[voice-speak ${requestId}] cloudflare ok but no audio (lang=${lang}): ${raw.slice(0, 200)}`);
        } else {
          lastStatus = r.status;
          console.error(`[voice-speak ${requestId}] cloudflare ${r.status} (lang=${lang}): ${raw.slice(0, 300)}`);
        }
      } catch (e) {
        console.error(`[voice-speak ${requestId}] cloudflare request failed (lang=${lang}):`, e);
      }
    }
    return json({ error: "Voice is unavailable right now. Please try again.", code: lastStatus === 429 ? "busy" : "upstream" }, 502);
  } catch (e) {
    console.error(`[voice-speak ${requestId}]`, e);
    return json({ error: "Something went wrong. Please try again.", code: "internal" }, 500);
  }
});
