// lib/parser.ts — incremental parser for the tutor's line protocol.
//
// The model is asked for plain tagged lines (cheap to stream, no half-open JSON):
//
//   REPLY: <Japanese reply, may span lines>
//   TR: <translation>
//   FIX: <what they said> => <corrected> | <why>      (or: FIX: none)
//   TIP: <phrase to try> | <why>                       (or: TIP: none)
//
// `TagStream.push()` returns only the NEW text of the REPLY section so it can be
// forwarded as SSE deltas while the rest of the answer is still being generated.
// Pure TypeScript, no Deno APIs → runs under `node --test` as well.

export interface Correction { original: string; corrected: string; explanation: string }
export interface Suggestion { text: string; explanation: string }
export interface TutorResult {
  reply: string;
  translation: string;
  correction: Correction | null;
  suggestion: Suggestion | null;
}

const TAGS = ['\nTR:', '\nFIX:', '\nTIP:'];
const MAX_FIELD = 700;

function clean(s: string): string {
  return s.replace(/[*`]/g, '').replace(/<\/?think>/gi, '').trim().slice(0, MAX_FIELD);
}

/** Longest suffix of `s` that could still become the start of a tag. */
function heldBack(s: string): number {
  let hold = 0;
  for (const tag of TAGS) {
    const max = Math.min(tag.length - 1, s.length);
    for (let n = max; n > hold; n--) {
      if (tag.startsWith(s.slice(s.length - n))) { hold = n; break; }
    }
  }
  return hold;
}

export class TagStream {
  private raw = '';
  private emitted = 0;
  private plain = false;

  /** Feed a chunk; returns text that is safe to show in the reply bubble ('' if none). */
  push(chunk: string): string {
    this.raw += chunk;
    const m = /(^|\n)\s*REPLY:[ \t]*/i.exec(this.raw);

    if (!m) {
      // Model ignored the format: after 24 chars with no tag, stream everything as the reply.
      if (!this.plain && this.raw.length >= 24 && !/^\s*(REPLY|TR|FIX|TIP):/i.test(this.raw)) this.plain = true;
      if (!this.plain) return '';
      const out = this.raw.slice(this.emitted);
      this.emitted = this.raw.length;
      return out.replace(/[*`]/g, '');
    }

    const start = m.index + m[0].length;
    const body = this.raw.slice(start);
    let end = -1;
    for (const tag of TAGS) {
      const i = body.indexOf(tag);
      if (i !== -1 && (end === -1 || i < end)) end = i;
    }
    const safeEnd = end !== -1 ? end : body.length - heldBack(body);
    const visible = body.slice(0, Math.max(0, safeEnd));
    const out = visible.slice(this.emitted);
    this.emitted = Math.max(this.emitted, visible.length);
    return out.replace(/[*`]/g, '');
  }

  /** Call once after the stream ends. */
  finish(): TutorResult {
    const raw = this.raw.replace(/\r/g, '');
    const m = /(^|\n)\s*REPLY:[ \t]*/i.exec(raw);
    if (!m) return { reply: clean(raw), translation: '', correction: null, suggestion: null };

    const body = raw.slice(m.index + m[0].length);
    const section = (tag: string): string => {
      const r = new RegExp('(?:^|\\n)\\s*' + tag + ':[ \\t]*([\\s\\S]*?)(?=\\n\\s*(?:REPLY|TR|FIX|TIP):|$)', 'i').exec('\n' + body);
      return r ? r[1].trim() : '';
    };
    const cut = body.search(/\n\s*(?:TR|FIX|TIP):/i);
    const reply = clean(cut === -1 ? body : body.slice(0, cut));

    return {
      reply,
      translation: clean(section('TR')),
      correction: parseFix(section('FIX')),
      suggestion: parseTip(section('TIP')),
    };
  }
}

export function parseFix(line: string): Correction | null {
  line = clean(line);
  if (!line || /^(none|なし|n\/a|-)$/i.test(line) || !line.includes('=>')) return null;
  const [said, rest] = line.split('=>', 2);
  const parts = rest.split('|');
  const corrected = clean(parts[0] ?? '');
  const original = clean(said);
  if (!original || !corrected || original === corrected) return null;
  return { original, corrected, explanation: clean(parts.slice(1).join('|')) };
}

export function parseTip(line: string): Suggestion | null {
  line = clean(line);
  if (!line || /^(none|なし|n\/a|-)$/i.test(line)) return null;
  const [text, ...why] = line.split('|');
  const t = clean(text);
  return t ? { text: t, explanation: clean(why.join('|')) } : null;
}
