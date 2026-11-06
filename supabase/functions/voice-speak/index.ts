import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUILD = "s1";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const VOICES: Record<string, string> = {
  female: "ja-JP-Chirp3-HD-Aoede",
  female2: "ja-JP-Chirp3-HD-Sulafat",
  male: "ja-JP-Chirp3-HD-Charon",
  male2: "ja-JP-Chirp3-HD-Achird",
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
    if (!data?.user) return json({ error: "[" + BUILD + "] Please sign in." }, 401);

    const body = await req.json();
    const text = String(body.text ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
    if (!text) return json({ error: "[" + BUILD + "] No text." }, 400);
    const name = VOICES[body.voice] ?? VOICES.female;
    const rate = Math.min(1.3, Math.max(0.7, Number(body.rate) || 1));
    const key = Deno.env.get("GOOGLE_TTS_KEY");
    if (!key) return json({ error: "[" + BUILD + "] GOOGLE_TTS_KEY secret is missing." }, 500);

    const r = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "ja-JP", name },
        audioConfig: { audioEncoding: "MP3", speakingRate: rate },
      }),
    });
    const raw = await r.text();
    if (!r.ok) return json({ error: "[" + BUILD + "] Google " + r.status + ": " + raw.slice(0, 300) }, 502);
    return json({ build: BUILD, audio: JSON.parse(raw).audioContent });
  } catch (e) {
    return json({ error: "[" + BUILD + "] " + String((e as Error)?.message ?? e) }, 500);
  }
});
