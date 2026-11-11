// lib/providers.ts — streaming LLM calls with timeouts and primary → fallback failover.
// Uses only fetch/AbortController/TextDecoder, so it also runs under Node 20+.

export interface ChatMsg { role: 'system' | 'user' | 'assistant'; content: string }
export interface GenOptions { maxTokens: number; temperature: number; signal?: AbortSignal }

export class ProviderError extends Error {
  retryable: boolean; status: number; started: boolean;
  constructor(message: string, status: number, retryable: boolean, started: boolean) {
    super(message); this.status = status; this.retryable = retryable; this.started = started;
  }
}

const FIRST_TOKEN_MS = 12_000;   // give up on a provider that has not produced a token
const IDLE_MS = 15_000;          // …or that stalls mid-stream

/** Yields the `data:` payloads of an SSE response. */
async function* sseData(res: Response, onActivity: () => void): AsyncGenerator<string> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      onActivity();
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.search(/\r?\n\r?\n/)) !== -1) {
        const block = buf.slice(0, i);
        buf = buf.slice(i + (buf[i] === '\r' ? 4 : 2));
        const data = block.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trimStart()).join('\n');
        if (data) yield data;
      }
    }
    const tail = buf.trim();
    if (tail.startsWith('data:')) yield tail.slice(5).trimStart();
  } finally {
    try { await reader.cancel(); } catch { /* ignore */ }
  }
}

async function* guarded(
  url: string, init: RequestInit, extract: (json: any) => string | undefined, opts: GenOptions, label: string,
): AsyncGenerator<string> {
  const ctl = new AbortController();
  const onAbort = () => ctl.abort();
  opts.signal?.addEventListener('abort', onAbort);
  let started = false;
  let timer = setTimeout(() => ctl.abort(), FIRST_TOKEN_MS);
  const bump = () => { clearTimeout(timer); timer = setTimeout(() => ctl.abort(), started ? IDLE_MS : FIRST_TOKEN_MS); };

  try {
    let res: Response;
    try { res = await fetch(url, { ...init, signal: ctl.signal }); }
    catch (e) {
      if (opts.signal?.aborted) throw e;
      throw new ProviderError(`${label} unreachable`, 0, true, false);
    }
    if (!res.ok || !res.body) {
      const retryable = res.status === 429 || res.status >= 500 || res.status === 408;
      try { await res.body?.cancel(); } catch { /* ignore */ }
      throw new ProviderError(`${label} HTTP ${res.status}`, res.status, retryable, false);
    }
    try {
      for await (const data of sseData(res, bump)) {
        if (data === '[DONE]') break;
        let json: any;
        try { json = JSON.parse(data); } catch { continue; }
        const piece = extract(json);
        if (piece) { started = true; bump(); yield piece; }
      }
    } catch (e) {
      if (opts.signal?.aborted) throw e;
      if (e instanceof ProviderError) throw e;
      throw new ProviderError(`${label} stream interrupted`, 0, true, started);
    }
    if (!started) throw new ProviderError(`${label} returned no content`, 502, true, false);
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

export function streamGroq(messages: ChatMsg[], model: string, apiKey: string, opts: GenOptions) {
  return guarded(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true, temperature: opts.temperature, max_tokens: opts.maxTokens }),
    },
    (j) => j?.choices?.[0]?.delta?.content || undefined,
    opts, 'groq',
  );
}

export function streamGemini(messages: ChatMsg[], model: string, apiKey: string, opts: GenOptions) {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const contents = messages.filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  return guarded(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
    {
      method: 'POST',
      // key in a header, not in the URL (URLs end up in logs)
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: opts.temperature, maxOutputTokens: opts.maxTokens },
      }),
    },
    (j) => j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('') || undefined,
    opts, 'gemini',
  );
}

export interface ProviderPlan { name: string; run: (m: ChatMsg[], o: GenOptions) => AsyncGenerator<string> }

/**
 * Try providers in order. Fail over only when NOTHING was streamed yet;
 * if a provider dies mid-answer the error is raised so the client can offer "retry".
 */
export async function* generate(plans: ProviderPlan[], messages: ChatMsg[], opts: GenOptions, onProvider?: (name: string) => void): AsyncGenerator<string> {
  let last: unknown = new ProviderError('No AI provider configured', 503, false, false);
  for (const plan of plans) {
    let started = false;
    try {
      onProvider?.(plan.name);
      for await (const piece of plan.run(messages, opts)) { started = true; yield piece; }
      return;
    } catch (e) {
      last = e;
      if (opts.signal?.aborted) throw e;
      if (started) throw e;
      if (e instanceof ProviderError && !e.retryable) continue;   // e.g. 401/400: try the next one anyway
    }
  }
  throw last;
}
