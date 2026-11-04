export function validateMessageRequest(body: any) {
  if (!body || typeof body !== 'object') throw new Error('Invalid request body');
  const validActions = ['send_message', 'create_session', 'get_sessions', 'get_history', 'update_profile'];
  if (!validActions.includes(body.action)) throw new Error('Invalid action');
  
  if (body.action === 'send_message') {
    if (typeof body.message !== 'string' || body.message.trim().length === 0) throw new Error('Message is required');
    if (body.message.length > 500) throw new Error('Message exceeds 500 characters');
    if (!['N5', 'N4', 'N3'].includes(body.level)) throw new Error('Invalid JLPT level');
  }
  if (body.action === 'get_history' && typeof body.sessionId !== 'string') throw new Error('sessionId required');
  if (body.action === 'update_profile' && !['N5', 'N4', 'N3'].includes(body.level)) throw new Error('Invalid level');
  return body;
}

export function validateLlmResponse(data: any): boolean {
  if (!data || typeof data !== 'object' || typeof data.reply !== 'string') return false;
  if (data.correction && (typeof data.correction !== 'object' || !data.correction.original)) return false;
  if (data.suggestion && (typeof data.suggestion !== 'object' || !data.suggestion.text)) return false;
  return true;
}
