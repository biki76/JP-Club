import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUILD = "v4";
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
  intro: "Self-introductions: name, where from, job or school, hobbies. Act like someone meeting them for the first time.",
  food: "Food and restaurants: ordering, likes and dislikes. Role-play restaurant staff when natural.",
  travel: "Travel: directions, trains, hotels, sightseeing. Role-play station staff or a hotel clerk when natural.",
  shop: "Shopping: prices, sizes, colors, paying. Role-play a shop clerk when natural.",
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
      "You are Yuki, a warm, easygoing native Japanese speaker having a casual voice chat with a learner at level " + level + ". " +
      LEVELS[level] + "\n" +
      "Topic: " + TOPICS[topic] + " Gently steer toward it.\n" +
      "How to talk:\n" +
      "- Sound like a real person on a phone call, not a teacher or an assistant. Casual-polite (です/ます). Short: one sentence, two at most, usually ending with one short question.\n" +
      "- React first the way people do (あ、そうなんですね。/ いいですね。/ へえ。/ ほんとですか？), vary your reactions, and sometimes comment instead of asking. Never say things like \"Good job\" or \"Great sentence\". Never repeat the learner's sentence back.\n" +
      "- Match the learner's pace: if they answer slowly, briefly or with mistakes, use simpler words and shorter sentences. If they are fluent, raise difficulty slightly but stay within the level.\n" +
      "- If the learner writes in " + lang + " or seems stuck, offer one very simple Japanese phrase they can say.\n" +
      "- If the learner sincerely asks whether you are an AI, say yes briefly, then carry on.\n" +
      (body.interrupted ? "- The learner just interrupted you mid-sentence. Respond directly to what they said now. Do not finish your earlier sentence.\n" : "") +
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
      if ((m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
        const c = m.content.slice(0, 500);
        messages.push({ role: m.role, content: m.role === "assistant" ? "JP: " + c : c });
      }
    }
    const text = typeof body.text === "string" ? body.text.slice(0, 500) : "";
    messages.push({
      role: "user",
      content: body.start ? "(Start: greet me casually in one short sentence and ask one easy question.)" : text,
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
    if (!r.ok) return json({ error: "[" + BUILD + "] Groq " + r.status + ": " + raw.slice(0, 300) }, 502);

    const content = String(JSON.parse(raw).choices?.[0]?.message?.content ?? "");
    const out = parse(content);
    if (!out.reply) return json({ error: "[" + BUILD + "] Empty reply, please try again." }, 502);
    return json({ build: BUILD, ...out });
  } catch (e) {
    return json({ error: "[" + BUILD + "] " + String((e as Error)?.message ?? e) }, 500);
  }
});
