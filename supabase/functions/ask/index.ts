// POST /functions/v1/ask
// Conversational tutor over a capture's content.
//
// Body: { captureId, messages: [{ role, content }] }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { claudeText } from '../_shared/ai.ts';
import { ASK_SYSTEM } from '../_shared/prompts.ts';

interface Body {
  captureId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

Deno.serve(async (req: Request) => {
  const cors = handleOptions(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const { captureId, messages } = (await req.json()) as Body;
    if (!captureId || !messages?.length) {
      return json({ error: 'captureId and messages required' }, 400);
    }

    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: capture, error } = await client
      .from('captures')
      .select('raw_text')
      .eq('id', captureId)
      .single();

    if (error || !capture?.raw_text) {
      return json({ error: 'Capture not found or empty' }, 404);
    }

    const system = `${ASK_SYSTEM}\n\nSTUDY MATERIAL:\n"""\n${capture.raw_text}\n"""`;

    const reply = await claudeText('', {
      system,
      messages,
      maxTokens: 1024,
    });

    return json({ reply });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
