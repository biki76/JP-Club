// supabase/functions/voice-tutor/index.ts — spoken-conversation tutor (Groq).
//
// Single file on purpose: paste it into the dashboard editor (Edge Functions → voice-tutor → Code).
// Secrets:  GROQ_API_KEY, optional ALLOWED_ORIGINS="https://biki76.github.io,http://localhost:8000"
// Keep "Verify JWT" ON.
//
// What changed vs the old version (prompt/parse logic is untouched):
//  - Groq/upstream errors are logged on the server only; the browser gets a generic message + requestId
//  - CORS allow-list instead of "*"
//  - per-user rate limit (best effort, in-memory), request timeout, input validation
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const BUILD = "v7";
const MODEL = "openai/gpt-oss-120b";
const DEFAULT_ORIGINS = ["https://biki76.github.io", "http://localhost:8000", "http://127.0.0.1:8000"];
const PER_MINUTE = 12;          // per user, per function instance
const UPSTREAM_TIMEOUT_MS = 30_000;
const MAX_BODY = 16 * 1024;

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

// control chars, zero-width + bidi overrides
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;
function clean(v: unknown, max: number): string {
  return (typeof v === "string" ? v : "").normalize("NFC").replace(CTRL, "").trim().slice(0, max);
}
const LEVELS: Record<string, string> = {
  N5: "Complete beginner. Use only very simple Japanese (です/ます, basic words, mostly hiragana), one short sentence.",
  N4: "Elementary. Simple sentences, common te-form and basic grammar, everyday topics.",
  N3: "Intermediate. Natural everyday Japanese, connected sentences, common idioms.",
  N2: "Upper-intermediate. Natural Japanese with varied grammar and abstract topics.",
  N1: "Advanced. Fully natural Japanese including nuance, keigo and idioms.",
};
const TOPICS: Record<string, string> = {
  free: "Free conversation about everyday life at the learner's level.",
  intro: "Self-introduction practice: name, country (〜から来ました), whether they are a student, 〜です. Act like someone meeting them for the first time.",
  hobby: "Hobbies and weekends: simple likes (〜が好きです) and weekend activities (〜をします).",
  food: "Food: asking what something is (これ、何ですか), ordering, and simple opinions (おいしいです). Role-play restaurant staff when natural.",
  daily: "Daily needs: asking prices (いくらですか), where things are (どこですか) and asking for help in shops (〜をお願いします). Role-play a shop clerk when natural.",
  weather: "Weather small talk as a safe icebreaker (暑いですね、雨ですね、いい天気ですね).",
  interview: "Part-time job interview. You are the friendly manager of a shop or restaurant interviewing the learner. Go step by step, one question at a time: greeting and entering the room (失礼します), their name (〜と申します), visa type and school hours (学生ビザです、〜から〜まで), days they can work (〜曜日に働けます) and commute time (電車で〜分), experience or willingness (経験があります、頑張ります). Stay polite and encouraging, and finish by thanking them.",
  travel: "Travel: directions, trains, hotels and sightseeing. Role-play station staff or a hotel clerk when natural.",
  shop: "Shopping: prices, sizes, colors and paying. Role-play a shop clerk when natural.",
};

function strip(s: string) {
  return s.replace(/\{([^|{}]*)\|[^{}]*\}/g, "$1").replace(/[{}|]/g, "").trim();
}

function parse(content: string) {
  const text = content.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/[*\u0060]/g, "").trim();
  const grab = (tag: string) => {
    const m = text.match(new RegExp("^\\s*" + tag + ":\\s*(.+)$", "mi"));
    return m ? m[1].trim() : "";
  };
  let markup = grab("JP");
  if (!markup) {
    const line = text.split("\n").find((l) => l.trim() && !/^\s*(TR|FIX):/i.test(l)) ?? "";
    markup = line.replace(/^\s*JP:\s*/i, "").trim();
  }
  const fx = grab("FIX");
  let correction: { said: string; better: string; why: string } | null = null;
  if (fx && !/^none/i.test(fx) && fx.includes("=>")) {
    const [said, rest] = fx.split("=>");
    const parts = rest.split("|");
    const better = strip(parts[0] ?? "");
    if (better) correction = { said: strip(said), better, why: parts.slice(1).join("|").trim() };
  }
  return { markup, reply: strip(markup), translation: grab("TR"), correction };
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
  if (origin && !allowedOrigins().includes(origin)) { console.warn("[voice-tutor " + requestId + "] rejected origin " + String(origin).slice(0, 100)); return json({ error: "Origin not allowed.", code: "origin" }, 403); }

  try {
    const header = req.headers.get("Authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return json({ error: "Please sign in to use AI Tutor.", code: "unauthorized" }, 401);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await sb.auth.getUser(token);
    if (!data?.user) { console.warn("[voice-tutor " + requestId + "] unauthenticated request"); return json({ error: "Please sign in to use AI Tutor.", code: "unauthorized" }, 401); }

    if (limited(data.user.id)) { console.warn("[voice-tutor " + requestId + "] rate limited user " + data.user.id); return json({ error: "Too many requests. Please wait a moment.", code: "rate_limited" }, 429, { "Retry-After": "30" }); }

    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY) return json({ error: "Request too large.", code: "too_large" }, 413);
    let body: any;
    try { body = JSON.parse(rawBody); } catch { return json({ error: "Invalid request.", code: "bad_json" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Invalid request.", code: "bad_body" }, 400);

    // FIXED_GREETING: the very first line is a checked sentence, not model output.
    // The model used to read ムーン wrongly and say きょう… at the start.
    if (body.start === true) {
      const greet = "こんにちは、ムーンです。よろしくお願いします。お名前は何ですか。";
      const tr = body.lang === "en" ? "Hello, I am Moon. Nice to meet you. What is your name?" : "নমস্কার, আমি মুন। আপনার সাথে পরিচিত হয়ে ভালো লাগছে। আপনার নাম কী?";
      return json({ build: BUILD, markup: greet, reply: greet, translation: tr, correction: null });
    }
    const level = LEVELS[body.level] ? body.level : "N5";
    const topic = TOPICS[body.topic] ? body.topic : "free";
    const lang = body.lang === "bn" ? "Bengali" : "English";

    const system =
      "You are Moon (ムーン), a mature, articulate and warm native Japanese speaker having a natural voice conversation with a learner at level " + level + ". Speak like an educated adult in Tokyo: calm, clear, never childish. " +
      LEVELS[level] + "\n" +
      "Topic: " + TOPICS[topic] + " Gently steer toward it.\n" +
      "How to talk:\n" +
      "- Your name is ムーン (Moon). Always read it as ムーン. Never read it as きょう or any other word. When you introduce yourself, say ムーンです.\n" +
      "- Use a short backchannel (そうですか。/ なるほど。/ いいですね。) only when it fits naturally, not in every reply.\n" +
      "- Keep sentences short and simple, subject + object + verb (私は寿司を食べます). Use easy positive adjectives like 楽しい、おいしい、すごい. Always stay polite (です/ます).\n" +
      "- If the learner says もう一度お願いします or seems not to understand, repeat your last sentence once, slower and simpler.\n" +
      "- Sound like a real person on a phone call, not a teacher or an assistant. Casual-polite (です/ます). Short: one sentence, two at most, usually ending with one short question.\n" +
      "- React first the way people do (あ、そうなんですね。/ いいですね。/ へえ。/ ほんとですか？), vary your reactions, and sometimes comment instead of asking. Never say things like \"Good job\" or \"Great sentence\". Never repeat the learner's sentence back.\n" +
      "- Match the learner's pace: if they answer slowly, briefly or with mistakes, use simpler words and shorter sentences. If they are fluent, raise difficulty slightly but stay within the level.\n" +
      "- If the learner writes in " + lang + " or seems stuck, offer one very simple Japanese phrase they can say.\n" +
      "- Identity: your name is Moon (ムーン). You are the AI speaking tutor of JP-Club by Nihonsync, a site that helps Bengali-speaking learners practice Japanese. When asked who you are, your name, who made you or what you are, say you are Moon, JP-Club's AI tutor from Nihonsync, in Japanese at the learner's level. Never call yourself ChatGPT, GPT, OpenAI, Claude, Gemini or any other model or company name. If asked which AI model or company is behind you, say you are JP-Club's tutor and do not know the technical details. If asked whether you are an AI, say yes briefly. Never claim to be human.\n" +
      (body.interrupted === true ? "- The learner just interrupted you mid-sentence. Respond directly to what they said now. Do not finish your earlier sentence.\n" : "") +
      "Corrections: if the learner's last message has a clear grammar, particle or word mistake, give the corrected version and a one-sentence reason in " + lang + ". Fix only the single most important mistake. If it was fine, FIX is none.\n" +
      "The learner's text comes from speech recognition: ignore punctuation, spacing and kanji/kana choice, and treat likely mishearings as recognition errors, not mistakes.\n" +
      "Output exactly these three lines, plain text, no markdown, no romaji:\n" +
      "JP: <your Japanese reply. Wrap every word that contains kanji as {word|hiragana reading of the whole word}, for example {私|わたし}は{学生|がくせい}です。 Words with no kanji stay plain.>\n" +
      "TR: <natural " + lang + " translation of your reply>\n" +
      "FIX: none\n" +
      "or, when correcting:\n" +
      "FIX: <what they said> => <corrected version> | <reason in " + lang + ">";

    const messages: { role: string; content: string }[] = [{ role: "system", content: system }];
    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
    for (const m of history) {
      if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
        const c = clean(m.content, 500);
        if (!c) continue;
        messages.push({ role: m.role, content: m.role === "assistant" ? "JP: " + c : c });
      }
    }
    const text = clean(body.text, 500);
    messages.push({
      role: "user",
      content: body.start === true ? "(Start: greet me casually in one short sentence, tell me you are Moon, and ask one easy question.)" : text,
    });

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      console.error(`[voice-tutor ${requestId}] GROQ_API_KEY secret missing`);
      return json({ error: "The tutor is unavailable right now.", code: "unavailable" }, 503);
    }

    let r: Response;
    try {
      r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + groqKey, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, temperature: 0.7, max_tokens: 3000, reasoning_effort: "low", messages }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
    } catch (e) {
      console.error(`[voice-tutor ${requestId}] groq request failed:`, e);
      return json({ error: "The tutor took too long to answer. Please try again.", code: "timeout" }, 504);
    }
    const raw = await r.text();
    if (!r.ok) {
      console.error(`[voice-tutor ${requestId}] groq ${r.status}: ${raw.slice(0, 300)}`);
      return json({ error: "The tutor is busy right now. Please try again.", code: r.status === 429 ? "busy" : "upstream" }, r.status === 429 ? 429 : 502);
    }

    let content = "";
    try { content = String(JSON.parse(raw).choices?.[0]?.message?.content ?? ""); }
    catch { console.error(`[voice-tutor ${requestId}] groq returned non-JSON: ${raw.slice(0, 200)}`); }
    const out = parse(content);
    if (!out.reply) {
      console.error(`[voice-tutor ${requestId}] empty reply from model`);
      return json({ error: "The tutor did not answer. Please try again.", code: "empty" }, 502);
    }
    return json({ build: BUILD, ...out });
  } catch (e) {
    console.error(`[voice-tutor ${requestId}]`, e);
    return json({ error: "Something went wrong. Please try again.", code: "internal" }, 500);
  }
});
