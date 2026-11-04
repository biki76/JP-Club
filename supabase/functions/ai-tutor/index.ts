import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from './utils/auth.ts';
import { validateMessageRequest, validateLlmResponse } from './utils/validation.ts';
import { getSystemPrompt, JSON_SCHEMA_INSTRUCTION } from './prompts/tutor.ts';
import { callGroq } from './providers/groq.ts';
import { callGemini } from './providers/gemini.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { user, supabase } = await verifyAuth(req);
    const body = await req.json();
    const validated = validateMessageRequest(body);

    if (validated.action === 'create_session') {
      const { data: session, error } = await supabase.from('chat_sessions').insert({ user_id: user.id, jlpt_level: validated.level || 'N5' }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data: { sessionId: session.id } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (validated.action === 'get_sessions') {
      const { data: sessions, error } = await supabase.from('chat_sessions').select('id, jlpt_level, created_at, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(10);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data: sessions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (validated.action === 'get_history') {
      const { data: session } = await supabase.from('chat_sessions').select('user_id').eq('id', validated.sessionId).single();
      if (!session || session.user_id !== user.id) throw new Error('Unauthorized');
      const { data: messages, error } = await supabase.from('chat_messages').select('id, role, content, correction, suggestion, created_at').eq('session_id', validated.sessionId).order('created_at', { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data: messages }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (validated.action === 'update_profile') {
      const { error } = await supabase.from('user_profiles').upsert({ id: user.id, jlpt_level: validated.level });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (validated.action === 'send_message') {
      let currentSessionId = validated.sessionId;
      if (!currentSessionId) {
        const { data: newSession, error: sessErr } = await supabase.from('chat_sessions').insert({ user_id: user.id, jlpt_level: validated.level }).select().single();
        if (sessErr) throw sessErr;
        currentSessionId = newSession.id;
      } else {
        const { data: session } = await supabase.from('chat_sessions').select('user_id').eq('id', currentSessionId).single();
        if (!session || session.user_id !== user.id) throw new Error('Unauthorized');
      }

      const { data: history } = await supabase.from('chat_messages').select('role, content').eq('session_id', currentSessionId).order('created_at', { ascending: false }).limit(6);
      const systemPrompt = `${getSystemPrompt(validated.level)}\n\n${JSON_SCHEMA_INSTRUCTION}`;
      const llmMessages = [{ role: 'system', content: systemPrompt }, ...(history || []).reverse().map((m: any) => ({ role: m.role, content: m.content })), { role: 'user', content: validated.message }];

      const provider = Deno.env.get('AI_PROVIDER') || 'groq';
      const rawResponse = provider === 'groq' 
        ? await callGroq(llmMessages, Deno.env.get('AI_MODEL'), Deno.env.get('GROQ_API_KEY')!)
        : await callGemini(llmMessages, Deno.env.get('AI_MODEL'), Deno.env.get('GEMINI_API_KEY')!);

      const cleanJson = rawResponse.replace(/^```json\s*|\s*```$/g, '').trim();
      const parsedResponse = JSON.parse(cleanJson);
      if (!validateLlmResponse(parsedResponse)) throw new Error('LLM response failed validation');

      await supabase.from('chat_messages').insert({ session_id: currentSessionId, role: 'user', content: validated.message });
      await supabase.from('chat_messages').insert({ session_id: currentSessionId, role: 'assistant', content: parsedResponse.reply, correction: parsedResponse.correction, suggestion: parsedResponse.suggestion });
      await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', currentSessionId);

      return new Response(JSON.stringify({ success: true, data: { sessionId: currentSessionId, reply: parsedResponse.reply, correction: parsedResponse.correction, suggestion: parsedResponse.suggestion, level: parsedResponse.level || validated.level } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Edge Function Error:', error);
    const status = error.message?.includes('Unauthorized') ? 401 : 500;
    return new Response(JSON.stringify({ success: false, error: status === 401 ? 'Authentication failed' : error.message }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
