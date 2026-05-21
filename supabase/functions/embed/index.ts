// POST /functions/v1/embed
// Body: { ownerTable: 'cards' | 'captures' | 'summaries', ownerId: string, text: string }
//
// Idempotent: if an embedding already exists for the same (owner_table,
// owner_id) AND content_hash, skip the API call.
//
// This is normally invoked by background workers after a capture's
// generate-kit run completes. The semantic-search function reads the
// resulting rows.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { geminiEmbed, sha256Hex } from '../_shared/embeddings.ts';

interface Body {
  ownerTable: 'cards' | 'captures' | 'summaries';
  ownerId: string;
  text: string;
}

Deno.serve(async (req: Request) => {
  const cors = handleOptions(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const body = (await req.json()) as Body;
    if (!body.ownerTable || !body.ownerId || !body.text) {
      return json({ error: 'ownerTable, ownerId, text required' }, 400);
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return json({ error: 'No user' }, 401);

    const hash = await sha256Hex(body.text);

    // Skip if we already have this exact content embedded.
    const { data: existing } = await userClient
      .from('embeddings')
      .select('id, content_hash')
      .eq('owner_table', body.ownerTable)
      .eq('owner_id', body.ownerId)
      .maybeSingle();

    if (existing?.content_hash === hash) {
      return json({ ok: true, cached: true });
    }

    const vec = await geminiEmbed(body.text);
    if (!vec.length) return json({ error: 'Empty embedding' }, 500);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (existing) {
      await admin
        .from('embeddings')
        .update({ embedding: vec, content_hash: hash, content: body.text })
        .eq('id', existing.id);
    } else {
      await admin.from('embeddings').insert({
        user_id: userId,
        owner_table: body.ownerTable,
        owner_id: body.ownerId,
        content: body.text,
        content_hash: hash,
        embedding: vec,
      });
    }

    return json({ ok: true });
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
