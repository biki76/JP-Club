import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "openai/gpt-oss-120b";
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
  free: "Free conversation about everyday life.",
  intro: "Self-introductions: name, where from, job or school, hobbies. Role-play meeting someone new.",
  food: "Food and restaurants: ordering, likes and dislikes. Role-play as restaurant staff when natural.",
  travel: "Travel: directions, trains, hotels, sightseeing. Role-play as station staff or a hotel clerk when natural.",
  shop: "Shopping: prices, sizes, colors, paying. Role-play as a shop clerk when natural.",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

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
      "You are a friendly Japanese speaking partner for a learner at level " + level + ". " +
      LEVELS[level] + "\n" +
      "Topic: " + TOPICS[topic] + " Keep steering the conversation toward this goal.\n" +
      "Rules:\n" +
      "- Talk like a real conversation. Your reply is spoken aloud: 1-2 short Japanese sentences, then ONE easy follow-up question.\n" +
      "- Match the learner's pace. If they answer slowly, briefly or with mistakes, simplify and slow down. If they answer fluently, raise difficulty slightly, never beyond the level.\n" +
      "- If the learner writes in " + lang + " or seems stuck, give one very simple Japanese phrase they can repeat.\n" +
      "- Correct gently. If the learner's last message has a grammar, particle or word mistake, fill correction with what they said, a better version, and a one-sentence reason in " + lang + ". Correct only the most important mistake. If it was fine, correction is null.\n" +
      "- The learner text comes from speech recognition: ignore punctuation, spacing and kanji/kana choice, and treat likely mishearings as recognition errors, not mistakes.\n" +
      "- segments splits reply into words in order. Joining every t must give reply exactly. r is the hiragana reading only for a segment that contains kanji, otherwise an empty string.\n" +
      "- No romaji, no markdown.\n" +
      'Respond ONLY as JSON: {"reply":"Japanese","segments":[{"t":"word","r":"reading or empty"}],"translation":"' + lang + ' translation of reply","correction":null or {"said":"...","better":"...","why":"..."}}';

    const messages: { role: string; content: string }[] = [{ role: "system", content: system }];
    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
    for (const m of history) {
      if ((m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
        messages.push({ role: m.role, content: m.content.slice(0, 500) });
      }
    }
    const text = typeof body.text === "string" ? body.text.slice(0, 500) : "";
    messages.push({
      role: "user",
      content: body.start ? "(Start: greet me briefly and ask one easy question.)" : text,
    });

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + Deno.env.get("GROQ_API_KEY"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.6,
        max_tokens: 3000,
        response_format: { type: "json_object" },
        reasoning_effort: "low",
        messages,
      }),
    });
    const raw = await r.text();
    if (!r.ok) return json({ error: "Groq " + r.status + ": " + raw.slice(0, 300) }, 502);

    const content = JSON.parse(raw).choices?.[0]?.message?.content ?? "{}";
    let out: any;
    try { out = JSON.parse(content); } catch { out = { reply: content }; }

    const reply = String(out.reply ?? "");
    let segs: { t: string; r: string }[] = [];
    if (Array.isArray(out.segments)) {
      segs = out.segments
        .filter((s: any) => s && typeof s.t === "string")
        .map((s: any) => ({ t: s.t, r: typeof s.r === "string" ? s.r : "" }));
      if (segs.map((s) => s.t).join("") !== reply) segs = [];
    }
    return json({
      reply,
      segments: segs,
      translation: String(out.translation ?? ""),
      correction: out.correction ?? null,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
