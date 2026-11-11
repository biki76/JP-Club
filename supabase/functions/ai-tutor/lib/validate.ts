// lib/validate.ts — request validation + text sanitising (pure TS, node-testable).

export const LEVELS = ['N5', 'N4', 'N3'] as const;
export const MODES = ['chat', 'roleplay', 'correct', 'explain'] as const;
export const TOPICS = ['free', 'intro', 'hobby', 'food', 'daily', 'weather', 'shop', 'travel', 'interview'] as const;
export const ACTIONS = ['send_message', 'create_session', 'get_sessions', 'get_history', 'update_profile', 'delete_session'] as const;

export type Level = typeof LEVELS[number];
export type Mode = typeof MODES[number];
export type Topic = typeof TOPICS[number];
export type Action = typeof ACTIONS[number];

export const MAX_BODY_BYTES = 8 * 1024;
export const MAX_MESSAGE_CHARS = 500;

export class HttpError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// control chars, zero-width + bidi overrides
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

/** Clean text that will be placed inside a prompt. */
export function sanitizeText(input: unknown, max: number): string {
  let s = typeof input === 'string' ? input : '';
  s = s.normalize('NFC').replace(CTRL, '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  // neutralise anything that looks like our prompt delimiters / role markers
  s = s.replace(/[<>]/g, (c) => (c === '<' ? '＜' : '＞'));
  return s.length > max ? s.slice(0, max) : s;
}

function pick<T extends readonly string[]>(list: T, v: unknown, fallback: T[number]): T[number] {
  return typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T[number]) : fallback;
}

export interface TutorRequest {
  action: Action;
  message: string;
  level: Level;
  mode: Mode;
  topic: Topic;
  lang: 'bn' | 'en';
  lesson: number | null;
  patterns: string[];
  sessionId: string | null;
  stream: boolean;
}

export function parseBody(raw: string): TutorRequest {
  if (raw.length > MAX_BODY_BYTES) throw new HttpError(413, 'too_large', 'Request too large');
  let b: any;
  try { b = JSON.parse(raw); } catch { throw new HttpError(400, 'bad_json', 'Invalid JSON'); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw new HttpError(400, 'bad_body', 'Invalid request body');

  if (typeof b.action !== 'string' || !(ACTIONS as readonly string[]).includes(b.action)) {
    throw new HttpError(400, 'bad_action', 'Unknown action');
  }
  const action = b.action as Action;

  let sessionId: string | null = null;
  if (b.sessionId != null && b.sessionId !== '') {
    if (typeof b.sessionId !== 'string' || !UUID.test(b.sessionId)) throw new HttpError(400, 'bad_session', 'Invalid sessionId');
    sessionId = b.sessionId.toLowerCase();
  }
  if ((action === 'get_history' || action === 'delete_session') && !sessionId) {
    throw new HttpError(400, 'bad_session', 'sessionId required');
  }

  if (b.level != null && !(LEVELS as readonly string[]).includes(b.level)) throw new HttpError(400, 'bad_level', 'Invalid JLPT level');
  if (action === 'update_profile' && b.level == null) throw new HttpError(400, 'bad_level', 'Invalid JLPT level');

  const message = sanitizeText(b.message, MAX_MESSAGE_CHARS);
  if (action === 'send_message' && !message) throw new HttpError(400, 'empty_message', 'Message is required');
  if (action === 'send_message' && typeof b.message === 'string' && b.message.trim().length > MAX_MESSAGE_CHARS) {
    throw new HttpError(400, 'too_long', `Message exceeds ${MAX_MESSAGE_CHARS} characters`);
  }

  let lesson: number | null = null;
  if (b.lesson != null) {
    const n = Number(b.lesson);
    if (!Number.isInteger(n) || n < 1 || n > 50) throw new HttpError(400, 'bad_lesson', 'Invalid lesson');
    lesson = n;
  }

  const patterns: string[] = [];
  if (Array.isArray(b.patterns)) {
    for (const p of b.patterns.slice(0, 20)) {
      const t = sanitizeText(p, 40);
      if (t) patterns.push(t);
      if (patterns.length === 5) break;
    }
  }

  return {
    action, message, sessionId, lesson, patterns,
    level: pick(LEVELS, b.level, 'N5'),
    mode: pick(MODES, b.mode, 'chat'),
    topic: pick(TOPICS, b.topic, 'free'),
    lang: b.lang === 'en' ? 'en' : 'bn',
    stream: b.stream === true,
  };
}
