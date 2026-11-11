// supabase/functions/ai-tutor/index.ts — thin Deno wrapper around lib/handler.ts.
//
// Deploy:   supabase functions deploy ai-tutor
// Secrets:  supabase secrets set GROQ_API_KEY=... GEMINI_API_KEY=... AI_PROVIDER=groq \
//             ALLOWED_ORIGINS="https://biki76.github.io,http://localhost:8000"
// Keep the default "Verify JWT" ON for this function (do not pass --no-verify-jwt).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { handle, type Repo } from './lib/handler.ts';
import { HttpError } from './lib/validate.ts';

async function authenticate(req: Request): Promise<{ userId: string; repo: Repo }> {
  const header = req.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) throw new HttpError(401, 'unauthorized', 'Please sign in to use the tutor.');

  // The user's own JWT is forwarded, so every query below is subject to RLS.
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.getUser(token);      // server-side JWT validation
  if (error || !data?.user) throw new HttpError(401, 'unauthorized', 'Please sign in to use the tutor.');
  const userId = data.user.id;

  const repo: Repo = {
    async createSession(uid, level, mode, lesson) {
      const { data: s, error: e } = await db.from('chat_sessions')
        .insert({ user_id: uid, jlpt_level: level, mode, lesson }).select('id').single();
      if (e) throw e;
      return s.id as string;
    },
    async ownsSession(uid, sid) {
      const { data: s, error: e } = await db.from('chat_sessions').select('id').eq('id', sid).eq('user_id', uid).maybeSingle();
      if (e) throw e;
      return !!s;
    },
    async listSessions(uid) {
      const { data: rows, error: e } = await db.from('chat_sessions')
        .select('id, jlpt_level, mode, lesson, created_at, updated_at')
        .eq('user_id', uid).order('updated_at', { ascending: false }).limit(20);
      if (e) throw e;
      return rows ?? [];
    },
    async recentMessages(sid, limit) {
      const { data: rows, error: e } = await db.from('chat_messages')
        .select('role, content').eq('session_id', sid).order('created_at', { ascending: false }).limit(limit);
      if (e) throw e;
      return (rows ?? []).reverse();
    },
    async fullHistory(sid) {
      const { data: rows, error: e } = await db.from('chat_messages')
        .select('id, role, content, correction, suggestion, created_at')
        .eq('session_id', sid).order('created_at', { ascending: true }).limit(500);
      if (e) throw e;
      return rows ?? [];
    },
    async saveTurn(sid, userText, r) {
      // two inserts, not one: rows of a single statement share the same created_at
      const a = await db.from('chat_messages').insert({ session_id: sid, role: 'user', content: userText });
      if (a.error) throw a.error;
      const b = await db.from('chat_messages').insert({
        session_id: sid, role: 'assistant', content: r.reply, correction: r.correction, suggestion: r.suggestion,
      });
      if (b.error) throw b.error;
      await db.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sid);
    },
    async countUserMessages(_uid, sinceIso) {
      const { count, error: e } = await db.from('chat_messages')
        .select('id', { count: 'exact', head: true }).eq('role', 'user').gte('created_at', sinceIso);
      if (e) throw e;
      return count ?? 0;
    },
    async setLevel(uid, level) {
      const { error: e } = await db.from('user_profiles').upsert({ id: uid, jlpt_level: level });
      if (e) throw e;
    },
    async deleteSession(uid, sid) {
      const { error: e } = await db.from('chat_sessions').delete().eq('id', sid).eq('user_id', uid);
      if (e) throw e;
    },
  };
  return { userId, repo };
}

Deno.serve((req) => handle(req, { env: (k) => Deno.env.get(k), authenticate }));
