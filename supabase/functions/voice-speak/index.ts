import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUILD = "s2";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const acct = Deno.env.get("CF_ACCOUNT_ID");
    const tok = Deno.env.get("CF_API_TOKEN");
    if (!acct || !tok) return json({ error: "[" + BUILD + "] CF_ACCOUNT_ID / CF_API_TOKEN secrets are missing." }, 500);

    const url = "https://api.cloudflare.com/client/v4/accounts/" + acct + "/ai/run/@cf/myshell-ai/melotts";
    let last = "";
    for (const lang of ["jp", "ja"]) {
      const r = await fetch(url, {
        method: "POST",
        headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, lang }),
      });
      const raw = await r.text();
      if (r.ok) {
        const audio = JSON.parse(raw)?.result?.audio;
        if (audio) return json({ build: BUILD, audio });
        last = "no audio in response: " + raw.slice(0, 200);
      } else {
        last = r.status + ": " + raw.slice(0, 200);
      }
    }
    return json({ error: "[" + BUILD + "] Cloudflare " + last }, 502);
  } catch (e) {
    return json({ error: "[" + BUILD + "] " + String((e as Error)?.message ?? e) }, 500);
  }
});
