// supabase/functions/voice-tutor/index.ts
// Moon (ムーン) voice tutor edge function.

const FIXED_OPENER =
  "こんにちは、ムーンです。よろしくお願いします。お名前は何ですか。";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const OPENER_EN =
  "Hello, I'm Moon. Nice to meet you. What is your name?";
const OPENER_BN =
  "হ্যালো, আমি মুন। আপনার সাথে পরিচিত হয়ে ভালো লাগলো। আপনার নাম কি?";

interface Candidate {
  jp: string;
  furigana: string;
  en: string;
  bn: string;
}

interface Turn {
  role: "user" | "moon";
  text: string;
}

function corsHeaders(origin: string): Record<string, string> {
  const allowed = ALLOWED_ORIGINS.length === 0
    ? (origin || "*")
    : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(
  body: unknown,
  status: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

// ---------- Pure helpers (kept in sync with js/tutor-voice.js) ----------

export function applyOpenerPostCheck(text: string, hasPrior: boolean): string {
  if (!hasPrior) return FIXED_OPENER;
  if (typeof text !== "string") return "";
  if (text.indexOf("きょうは") === 0) {
    return "こんにちは、" + text.slice("きょうは".length);
  }
  return text;
}

export function correctSelfIntro(text: string): string {
  if (typeof text !== "string") return "";
  const re =
    /(わたしは|私は|ぼくは|僕は)([^。、\n]+?)(です|といいます|と言います|っていいます)。?/g;
  return text.replace(re, (m: string, _p1: string, p2: string) => {
    const name = String(p2).trim();
    if (name === "ムーン") return m;
    return "わたしはムーンです。";
  });
}

export function prepareSpeech(text: string): string {
  if (typeof text !== "string") return "";
  let out = text;
  out = out.replace(/Moon/g, "ムーン").replace(/moon/g, "ムーン");
  out = out.replace(/ムン(?!ー)/g, "ムーン");
  out = out.replace(/\*\*(.+?)\*\*/g, "$1");
  out = out.replace(/\*(.+?)\*/g, "$1");
  out = out.replace(/`([^`]+)`/g, "$1");
  out = out.replace(/。{2,}/g, "。");
  return out.trim();
}

export function parseCandidates(raw: string): Candidate[] {
  const fallback: Candidate[] = [{
    jp: "すみません、うまく聞き取れませんでした。もう一度お願いします。",
    furigana: "すみません、うまくききとれませんでした。もういちどおねがいします。",
    en: "Sorry, I could not catch that. Please try again.",
    bn: "দুঃখিত, আমি বুঝতে পারিনি। আবার বলুন।",
  }];
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  let s = raw.trim();
  s = s.replace(/^```[a-zA-Z]*\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  let parsed: unknown;
  try {
    parsed = JSON.parse(s);
  } catch {
    return fallback;
  }
  if (!Array.isArray(parsed)) return fallback;
  const out: Candidate[] = [];
  for (const item of parsed) {
    if (out.length >= 3) break;
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const jp = typeof o.jp === "string" ? o.jp : "";
    if (!jp) continue;
    out.push({
      jp,
      furigana: typeof o.furigana === "string" ? o.furigana : jp,
      en: typeof o.en === "string" ? o.en : "",
      bn: typeof o.bn === "string" ? o.bn : "",
    });
  }
  return out.length ? out : fallback;
}

export function interruptionReply(): string {
  return "あ、すみません。どうぞ。";
}

export function nameAcknowledgement(name: string): string {
  const n = String(name || "").trim();
  if (!n) return "お名前を教えていただけますか。";
  return `はじめまして、${n}さん。よろしくお願いします。`;
}

// ---------- Model call ----------

const SYSTEM_PROMPT = [
  "You are Moon (ムーン), a warm, mature, intelligent Japanese teacher",
  "talking with an adult learner.",
  "Reply in natural spoken Japanese using です/ます.",
  "Use casual forms only if the learner uses them first.",
  "Keep sentences short. Acknowledge what the learner said first.",
  "Use natural spoken fillers where they fit: えーと, うーん, そうですね,",
  "ああ, なるほど.",
  "No excessive praise. No childish phrasing.",
  "Never introduce yourself with any name other than ムーン.",
  "When the learner gives their name, acknowledge it as the learner's name,",
  "never as yours. Never echo the learner's name as your own.",
  "Never open a reply with きょうは.",
  "Every reply must answer the learner's most recent message specifically,",
  "then ask exactly one natural follow-up question.",
  "Generic filler replies are not allowed.",
  "Return ONLY a JSON array of exactly three candidate replies.",
  "Each element is an object with keys: jp, furigana, en, bn.",
  "jp is Japanese. furigana is the same Japanese with readings.",
  "en is English. bn is Bengali.",
  "Do not include Markdown fences. Do not include prose outside the array.",
].join("\n");

async function callModel(history: Turn[], message: string): Promise<string> {
  const url = Deno.env.get("LLM_API_URL") ?? "";
  const key = Deno.env.get("LLM_API_KEY") ?? "";
  const model = Deno.env.get("LLM_MODEL") ?? "";
  if (!url || !key || !model) return "";
  const lines: string[] = [];
  for (const t of history.slice(-8)) {
    const tag = t.role === "user" ? "Learner" : "Moon";
    lines.push(`${tag}: ${t.text}`);
  }
  lines.push(`Learner: ${message}`);
  const userContent = lines.join("\n");
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.8,
    }),
  });
  if (!resp.ok) return "";
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (typeof data?.text === "string") return data.text;
  return "";
}

// ---------- Handler ----------

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405, cors);
  }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  if (!token) {
    return jsonResponse({ error: "missing bearer token" }, 401, cors);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid json" }, 400, cors);
  }

  const history: Turn[] = Array.isArray(body.history)
    ? (body.history as unknown[])
      .filter((t): t is Turn =>
        !!t && typeof t === "object" &&
        (((t as Turn).role === "user") || ((t as Turn).role === "moon")) &&
        typeof (t as Turn).text === "string"
      )
      .slice(-8)
    : [];
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const interrupted = body.interrupted === true;
  const turnId = crypto.randomUUID();
  const hasPrior = history.length > 0;

  if (interrupted) {
    const jp = interruptionReply();
    const cand: Candidate = {
      jp,
      furigana: jp,
      en: "Ah, sorry. Please go ahead.",
      bn: "আহ, দুঃখিত। অনুগ্রহ করে বলুন।",
    };
    return jsonResponse({
      candidates: [cand, cand, cand],
      speech: prepareSpeech(jp),
      turnId,
    }, 200, cors);
  }

  if (!hasPrior) {
    const cand: Candidate = {
      jp: FIXED_OPENER,
      furigana: FIXED_OPENER,
      en: OPENER_EN,
      bn: OPENER_BN,
    };
    return jsonResponse({
      candidates: [cand, cand, cand],
      speech: prepareSpeech(FIXED_OPENER),
      turnId,
    }, 200, cors);
  }

  const raw = await callModel(history, message);
  let candidates = parseCandidates(raw);

  candidates = candidates.map((c) => {
    const jp = correctSelfIntro(applyOpenerPostCheck(c.jp, true));
    const furigana = correctSelfIntro(applyOpenerPostCheck(c.furigana, true));
    return { jp, furigana, en: c.en, bn: c.bn };
  });

  const top = candidates[0];
  return jsonResponse({
    candidates,
    speech: prepareSpeech(top.jp),
    turnId,
  }, 200, cors);
});
