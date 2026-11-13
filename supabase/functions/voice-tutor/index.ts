import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUILD = "v7";
const MODEL = "openai/gpt-oss-120b";

const OPENING = "こんにちは、ムーンです。よろしくお願いします。お名前は何ですか。";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEVELS: Record<string, string> = {
  N5: "Complete beginner. Use only very simple Japanese (です/ます, basic words, mostly hiragana), one short sentence.",
  N4: "Elementary. Simple sentences, common te-form and basic grammar, everyday topics.",
  N3: "Intermediate. Natural everyday Japanese, connected sentences, common idioms.",
  N2: "Upper-intermediate. Natural Japanese with varied grammar and abstract topics.",
  N1: "Advanced. Fully natural Japanese including nuance, keigo and idioms.",
};

const TOPICS: Record<string, string> = {
  free: "Free conversation about everyday life at the learner's level.",
  intro:
    "Self-introduction practice: name, country (〜から来ました), whether they are a student, 〜です. Act like someone meeting them for the first time.",
  hobby:
    "Hobbies and weekends: simple likes (〜が好きです) and weekend activities (〜をします).",
  food:
    "Food: asking what something is (これ、何ですか), ordering, and simple opinions (おいしいです). Role-play restaurant staff when natural.",
  daily:
    "Daily needs: asking prices (いくらですか), where things are (どこですか) and asking for help in shops (〜をお願いします). Role-play a shop clerk when natural.",
  weather: "Weather small talk as a safe icebreaker (暑いですね、雨ですね、いい天気ですね).",
  interview:
    "Part-time job interview. You are the friendly manager of a shop or restaurant interviewing the learner. Go step by step, one question at a time: greeting and entering the room (失礼します), their name (〜と申します), visa type and school hours (学生ビザです、〜から〜まで), days they can work (〜曜日に働けます) and commute time (電車で〜分), experience or willingness (経験があります、頑張ります). Stay polite and encouraging, and finish by thanking them.",
  travel:
    "Travel: directions, trains, hotels and sightseeing. Role-play station staff or a hotel clerk when natural.",
  shop:
    "Shopping: prices, sizes, colors and paying. Role-play a shop clerk when natural.",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function strip(s: string) {
  return s.replace(/\{([^|{}]*)\|[^{}]*\}/g, "$1").replace(/[{}|]/g, "").trim();
}

/** Rule 1: never open with きょうは. Replace that opening with こんにちは、. */
function fixOpening(text: string): string {
  return String(text).replace(/^\s*きょうは[、,\s]*/, "こんにちは、");
}

/** Rule 2: pull a likely learner name out of a short self-introduction. */
function extractName(text: string): string {
  const s = String(text || "");
  let m = s.match(/(?:わたしは|私は|ぼくは|僕は)\s*([^\s、。です]+)\s*です/);
  if (m) return m[1];
  m = s.match(/^([^\s、。です]+)\s*です[。]?$/);
  if (m) return m[1];
  return "";
}

/** Rule 2: true when Moon introduces itself using a name that is not ムーン. */
function nameEcho(reply: string, learnerName: string): boolean {
  if (!learnerName || learnerName === "ムーン") return false;
  const n = learnerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const s = String(reply || "");
  if (new RegExp("(?:わたしは|私は|ぼくは|僕は)\\s*" + n + "\\s*です").test(s)) return true;
  if (new RegExp("^\\s*" + n + "\\s*です[。]?").test(s)) return true;
  return false;
}

type Candidate = { jp: string; furigana: string; en: string; bn: string };

function normalizeCandidate(x: any): Candidate | null {
  if (!x || typeof x !== "object") return null;
  const jp = String(x.jp ?? x.reply ?? x.text ?? "").trim();
  if (!jp) return null;
  return {
    jp: fixOpening(jp),
    furigana: String(x.furigana ?? x.reading ?? jp).trim(),
    en: String(x.en ?? x.translation ?? x.gloss ?? "").trim(),
    bn: String(x.bn ?? "").trim(),
  };
}

function parseCandidates(content: string): Candidate[] {
  let text = String(content || "").replace(/[\s\S]*?<\/think>/gi, "").trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    const arr = JSON.parse(text);
    if (Array.isArray(arr)) {
      const out = arr.map(normalizeCandidate).filter(Boolean) as Candidate[];
      if (out.length) return out;
    }
    if (arr && Array.isArray(arr.candidates)) {
      const out = arr.candidates.map(normalizeCandidate).filter(Boolean) as Candidate[];
      if (out.length) return out;
    }
    if (arr && typeof arr === "object" && (arr.jp || arr.reply)) {
      const one = normalizeCandidate(arr);
      if (one) return [one];
    }
  } catch (_) {
    // fall through to the legacy JP/TR/FIX parser
  }

  const grab = (tag: string) => {
    const m = text.match(new RegExp("^\\s*" + tag + ":\\s*(.+)$", "mi"));
    return m ? m[1].trim() : "";
  };
  let jp = grab("JP");
  if (!jp) {
    const line =
      text.split("\n").find((l) => l.trim() && !/^\s*(TR|FIX):/i.test(l)) ?? "";
    jp = line.replace(/^\s*JP:\s*/i, "").trim();
  }
  if (jp) {
    return [
      {
        jp: fixOpening(strip(jp)),
        furigana: strip(jp),
        en: grab("TR"),
        bn: "",
      },
    ];
  }
  return [];
}

const SAFE: Candidate = {
  jp: "すみません、もう一度お願いします。",
  furigana: "すみません、もういちどおねがいします。",
  en: "Sorry, could you say that again?",
  bn: "দুঃখিত, আবার বলবেন?",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data } = await sb.auth.getUser();
    if (!data?.user) return json({ error: "Please sign in to use AI Tutor." }, 401);

    const body = await req.json();
    const level = LEVELS[body.level] ? body.level : "N5";
    const topic = TOPICS[body.topic] ? body.topic : "free";
    const lang = body.lang === "bn" ? "Bengali" : "English";

    const system =
      "You are Moon (ムーン), a calm, warm, mature native Japanese speaker having a natural conversation with an adult learner at level " +
      level +
      ". " +
      LEVELS[level] +
      "\n" +
      "Topic: " +
      TOPICS[topic] +
      " Gently steer toward it.\n" +
      "How to talk:\n" +
      "- Sound like a skilled teacher talking with an adult: calm, warm, assured. Short sentences. No childish phrasing. No excessive praise.\n" +
      "- Acknowledge what the learner said before moving on. React specifically to their last message.\n" +
      "- Answer the specific thing the learner just said, then ask exactly one natural follow-up question. Never use a generic line that could fit any message.\n" +
      "- Always stay polite (です/ます). Keep vocabulary and grammar at roughly JLPT N5–N4.\n" +
      "- It is fine to begin with a short natural aizuchi such as はい、 / そうですか。 / なるほど。 / いいですね。 Vary it.\n" +
      "- If the learner says もう一度お願いします or seems not to understand, repeat your last sentence once, slower and simpler.\n" +
      "- Never say things like \"Good job\" or \"Great sentence\". Never repeat the learner's sentence back.\n" +
      "- Match the learner's pace: simpler words and shorter sentences if they struggle; slightly more natural Japanese if they are fluent.\n" +
      "- If the learner writes in " +
      lang +
      " or seems stuck, offer one very simple Japanese phrase they can say.\n" +
      "- Identity: your name is Moon (ムーン). You are the AI speaking tutor of JP-Club by Nihonsync. Never call yourself ChatGPT, GPT, OpenAI, Claude, Gemini or any other model or company name. If asked which AI model or company is behind you, say you are JP-Club's tutor and do not know the technical details. If asked whether you are an AI, say yes briefly. Never claim to be human.\n" +
      "- Name rule: when the learner gives their name (e.g. わたしはビキです, or just ビキ), acknowledge it as the LEARNER'S name, e.g. はじめまして、ビキさん。よろしくお願いします。 Never repeat the learner's name as if it were your own name. Never introduce yourself with any name other than ムーン.\n" +
      "- Never open a new session with きょうは or わたしは. A new session opens with こんにちは.\n" +
      (body.interrupted
        ? "- The learner just interrupted you mid-sentence. Respond directly to what they said now. Do not finish your earlier sentence.\n"
        : "") +
      "\nOutput rules:\n" +
      "Return JSON only. No preamble, no Markdown fences, no commentary.\n" +
      "Return an array of exactly 3 candidate replies. Each candidate must be a complete, sensible reply to the learner's last message.\n" +
      'Each object: {"jp":"...","furigana":"...","en":"...","bn":"..."}\n' +
      "- jp: the reply in polite です/ます Japanese, roughly N5–N4.\n" +
      "- furigana: the same reply with {kanji|reading} markup, or full kana.\n" +
      "- en: an English gloss.\n" +
      "- bn: a Bengali gloss.\n" +
      "Keep candidates natural and different from each other, but all must answer the same learner message.\n" +
      (body.start
        ? "This is the first turn of a new session. The FIRST candidate's jp must be exactly: " +
          OPENING +
          "\n"
        : "");

    const messages: { role: string; content: string }[] = [
      { role: "system", content: system },
    ];

    // Rule 3: pass the last 6 turns (up to 12 messages) of history.
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    for (const m of history) {
      if (
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
      ) {
        const c = m.content.slice(0, 500);
        messages.push({
          role: m.role,
          content: m.role === "assistant" ? "JP: " + c : c,
        });
      }
    }

    const text = typeof body.text === "string" ? body.text.slice(0, 500) : "";
    messages.push({
      role: "user",
      content: body.start
        ? "(Start: greet the learner with exactly: " +
          OPENING +
          " Return the JSON array of 3 candidates. The first candidate must be exactly this opening.)"
        : text,
    });

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + Deno.env.get("GROQ_API_KEY"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        max_tokens: 3000,
        reasoning_effort: "low",
        messages,
      }),
    });

    const raw = await r.text();
    if (!r.ok) {
      return json({ error: "[" + BUILD + "] Groq " + r.status + ": " + raw.slice(0, 300) }, 502);
    }

    const content = String(JSON.parse(raw).choices?.[0]?.message?.content ?? "");
    let candidates = parseCandidates(content);

    // Rule 1 + Rule 4: make sure a new session always opens exactly right.
    if (body.start) {
      if (!candidates.length) candidates = [{ ...SAFE }];
      candidates[0] = {
        ...candidates[0],
        jp: OPENING,
        furigana: OPENING,
      };
    }

    // Rule 2: drop any candidate where Moon introduces itself with the learner's name.
    const learnerName = extractName(body.text || "");
    const filtered = candidates.filter((c) => !nameEcho(c.jp, learnerName));

    if (!filtered.length) {
      return json({
        build: BUILD,
        candidates: [SAFE],
        reply: SAFE.jp,
        markup: SAFE.furigana,
        translation: SAFE.en,
      });
    }

    const final = filtered.slice(0, 3);

    return json({
      build: BUILD,
      candidates: final,
      reply: final[0].jp,
      markup: final[0].furigana,
      translation: final[0].en,
    });
  } catch (e) {
    return json(
      { error: "[" + BUILD + "] " + String((e as Error)?.message ?? e) },
      500,
    );
  }
});
