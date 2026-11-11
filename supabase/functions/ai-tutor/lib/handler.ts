// lib/handler.ts — the whole tutor API as a pure function of (Request, Deps).
// index.ts wires real Supabase/Deno dependencies; tests wire fakes. No network imports here.
import { allowedOrigins, corsHeaders, isAllowed } from '../../_shared/cors.ts';
import { HttpError, parseBody, sanitizeText, type TutorRequest } from './validate.ts';
import { buildSystemPrompt, wrapLearnerMessage, LEVEL_SPEC } from './prompts.ts';
import { TagStream, type TutorResult } from './parser.ts';
import { generate, ProviderError, streamGemini, streamGroq, type ChatMsg, type ProviderPlan } from './providers.ts';

export interface Repo {
  createSession(userId: string, level: string, mode: string, lesson: number | null): Promise<string>;
  ownsSession(userId: string, sessionId: string): Promise<boolean>;
  listSessions(userId: string): Promise<unknown[]>;
  recentMessages(sessionId: string, limit: number): Promise<{ role: string; content: string }[]>;
  fullHistory(sessionId: string): Promise<unknown[]>;
  saveTurn(sessionId: string, userText: string, result: TutorResult): Promise<void>;
  countUserMessages(userId: string, sinceIso: string): Promise<number>;
  setLevel(userId: string, level: string): Promise<void>;
  deleteSession(userId: string, sessionId: string): Promise<void>;
}
export interface Deps {
  env: (key: string) => string | undefined;
  authenticate: (req: Request) => Promise<{ userId: string; repo: Repo }>;
  plans?: ProviderPlan[];                       // tests inject; production builds from env
  now?: () => number;
}

const enc = new TextEncoder();
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-store, no-transform',
  'X-Accel-Buffering': 'no',
};
const COMMON = { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' };

function sse(event: string, data: unknown): Uint8Array {
  return enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function buildPlans(env: Deps['env']): ProviderPlan[] {
  const groqKey = env('GROQ_API_KEY'), geminiKey = env('GEMINI_API_KEY');
  const primary = (env('AI_PROVIDER') || 'groq').toLowerCase();
  const legacy = env('AI_MODEL');
  const groqModel = env('AI_MODEL_GROQ') || (primary === 'groq' && legacy) || 'llama-3.3-70b-versatile';
  const geminiModel = env('AI_MODEL_GEMINI') || (primary === 'gemini' && legacy) || 'gemini-2.0-flash';
  const groq: ProviderPlan | null = groqKey ? { name: 'groq', run: (m, o) => streamGroq(m, groqModel as string, groqKey, o) } : null;
  const gem: ProviderPlan | null = geminiKey ? { name: 'gemini', run: (m, o) => streamGemini(m, geminiModel as string, geminiKey, o) } : null;
  return (primary === 'gemini' ? [gem, groq] : [groq, gem]).filter(Boolean) as ProviderPlan[];
}

function errorBody(e: unknown, requestId: string) {
  if (e instanceof HttpError) return { status: e.status, body: { code: e.code, message: e.message, retryable: false } };
  if (e instanceof ProviderError) {
    return {
      status: 503,
      body: {
        code: e.started ? 'stream_interrupted' : 'ai_unavailable',
        message: e.started ? 'The connection to the tutor was interrupted.' : 'The tutor is busy right now. Please try again.',
        retryable: true,
      },
    };
  }
  console.error(`[ai-tutor ${requestId}]`, e);
  return { status: 500, body: { code: 'internal', message: 'Something went wrong.', retryable: true } };
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const requestId = crypto.randomUUID().slice(0, 8);
  const allowed = allowedOrigins(deps.env('ALLOWED_ORIGINS'));
  const origin = req.headers.get('Origin');
  const cors = corsHeaders(origin, allowed);
  const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { ...COMMON, ...cors, ...extra, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json(405, { success: false, code: 'method', error: 'Method not allowed' });
  if (origin && !isAllowed(origin, allowed)) return json(403, { success: false, code: 'origin', error: 'Origin not allowed' });

  try {
    const { userId, repo } = await deps.authenticate(req);
    const len = Number(req.headers.get('content-length') || 0);
    if (len > 16 * 1024) throw new HttpError(413, 'too_large', 'Request too large');
    const body = parseBody(await req.text());

    switch (body.action) {
      case 'create_session': {
        const id = await repo.createSession(userId, body.level, body.mode, body.lesson);
        return json(200, { success: true, data: { sessionId: id } });
      }
      case 'get_sessions':
        return json(200, { success: true, data: await repo.listSessions(userId) });
      case 'get_history':
        if (!(await repo.ownsSession(userId, body.sessionId!))) throw new HttpError(404, 'not_found', 'Conversation not found');
        return json(200, { success: true, data: await repo.fullHistory(body.sessionId!) });
      case 'delete_session':
        if (!(await repo.ownsSession(userId, body.sessionId!))) throw new HttpError(404, 'not_found', 'Conversation not found');
        await repo.deleteSession(userId, body.sessionId!);
        return json(200, { success: true });
      case 'update_profile':
        await repo.setLevel(userId, body.level);
        return json(200, { success: true });
      case 'send_message':
        return await sendMessage(body, userId, repo, deps, { json, cors, requestId });
    }
  } catch (e) {
    const { status, body } = errorBody(e, requestId);
    const extra: Record<string, string> = {};
    if (e instanceof HttpError && e.status === 429) extra['Retry-After'] = '30';
    return json(status, { success: false, error: body.message, ...body, requestId }, extra);
  }
  return json(400, { success: false, code: 'bad_action', error: 'Unknown action' });
}

async function sendMessage(
  body: TutorRequest, userId: string, repo: Repo, deps: Deps,
  io: { json: (s: number, b: unknown, h?: Record<string, string>) => Response; cors: Record<string, string>; requestId: string },
): Promise<Response> {
  const now = (deps.now ?? Date.now)();
  const perMin = Number(deps.env('TUTOR_RATE_PER_MIN') || 10);
  const perHour = Number(deps.env('TUTOR_RATE_PER_HOUR') || 100);
  const [m1, h1] = await Promise.all([
    repo.countUserMessages(userId, new Date(now - 60_000).toISOString()),
    repo.countUserMessages(userId, new Date(now - 3_600_000).toISOString()),
  ]);
  if (m1 >= perMin || h1 >= perHour) throw new HttpError(429, 'rate_limited', 'Too many messages. Please wait a moment.');

  let sessionId = body.sessionId;
  if (sessionId) {
    if (!(await repo.ownsSession(userId, sessionId))) throw new HttpError(404, 'not_found', 'Conversation not found');
  } else {
    sessionId = await repo.createSession(userId, body.level, body.mode, body.lesson);
  }

  const history = await repo.recentMessages(sessionId, 8);
  const messages: ChatMsg[] = [
    { role: 'system', content: buildSystemPrompt(body) },
    ...history.map((m): ChatMsg => m.role === 'user'
      ? { role: 'user', content: wrapLearnerMessage(sanitizeText(m.content, 500)) }
      : { role: 'assistant', content: 'REPLY: ' + sanitizeText(m.content, 600) }),
    { role: 'user', content: wrapLearnerMessage(body.message) },
  ];

  const plans = deps.plans ?? buildPlans(deps.env);
  const spec = LEVEL_SPEC[body.level];
  const ac = new AbortController();
  const overall = setTimeout(() => ac.abort(), 45_000);
  const sid = sessionId;

  async function runTurn(onDelta: (t: string) => void) {
    const ts = new TagStream();
    let provider = '';
    for await (const piece of generate(plans, messages, { maxTokens: spec.maxTokens, temperature: 0.4, signal: ac.signal }, (n) => { provider = n; })) {
      const d = ts.push(piece);
      if (d) onDelta(d);
    }
    const result = ts.finish();
    if (!result.reply) throw new ProviderError('empty reply', 502, true, false);
    let saved = true;
    try { await repo.saveTurn(sid, body.message, result); } catch (e) { saved = false; console.error(`[ai-tutor ${io.requestId}] save failed`, e); }
    return { result, provider, saved };
  }

  const finalPayload = (r: Awaited<ReturnType<typeof runTurn>>) => ({
    sessionId: sid, level: body.level, mode: body.mode, provider: r.provider, saved: r.saved,
    reply: r.result.reply, translation: r.result.translation,
    correction: r.result.correction, suggestion: r.result.suggestion,
  });

  if (!body.stream) {
    try {
      const r = await runTurn(() => {});
      return io.json(200, { success: true, data: finalPayload(r) });
    } finally { clearTimeout(overall); }
  }

  let gone = false;                                    // client closed the connection
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: string, d: unknown) => { try { controller.enqueue(sse(ev, d)); } catch { /* client gone */ } };
      send('meta', { sessionId: sid, requestId: io.requestId });
      try {
        const r = await runTurn((t) => send('delta', { t }));
        send('done', finalPayload(r));
      } catch (e) {
        if (!gone) {
          if (ac.signal.aborted && !(e instanceof ProviderError)) {
            send('error', { code: 'timeout', message: 'The tutor took too long to answer.', retryable: true });
          } else {
            send('error', errorBody(e, io.requestId).body);
          }
        }
      } finally {
        clearTimeout(overall);
        try { controller.close(); } catch { /* already closed */ }
      }
    },
    cancel() { gone = true; ac.abort(); clearTimeout(overall); },
  });
  return new Response(stream, { status: 200, headers: { ...COMMON, ...SSE_HEADERS, ...io.cors } });
}
