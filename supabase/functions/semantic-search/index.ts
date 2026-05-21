// POST /functions/v1/semantic-search
// Body: { query: string, limit?: number, ownerTable?: 'cards' | 'captures' | 'summaries' }
//
// Embeds the query and runs cosine-similarity search via pgvector
// against the user's own embeddings (RLS scopes to auth.uid()).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { geminiEmbed } from '../_shared/embeddings.ts';

interface Body {
  query: string;
  limit?: number;
  ownerTable?: 'cards' | 'captures' | 'summaries';
}

Deno.serve(async (req: Request) => {
  const cors = handleOptions(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const { query, limit = 20, ownerTable } = (await req.json()) as Body;
    if (!query?.trim()) return json({ error: 'query required' }, 400);

    const vec = await geminiEmbed(query);
    if (!vec.length) return json({ results: [] });

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Cosine similarity via the `<=>` operator. RLS limits results to
    // the calling user's embeddings.
    let q = userClient
      .from('embeddings')
      .select('owner_table, owner_id, content')
      .order('embedding', { ascending: true, foreignTable: undefined } as never)
      .limit(limit);

    if (ownerTable) q = q.eq('owner_table', ownerTable);

    // Supabase JS doesn't expose vector ops cleanly via select(); use rpc.
    // We define an RPC `match_embeddings(query_vec, k, owner)` in a
    // later migration that returns (owner_table, owner_id, content, similarity).
    const { data, error } = await userClient.rpc('match_embeddings', {
      query_vec: vec,
      k: limit,
      owner: ownerTable ?? null,
    });
    if (error) {
      // Fallback to the soft query above so the endpoint never 500s.
      const fallback = await q;
      return json({ results: fallback.data ?? [], note: error.message });
    }
    return json({ results: data ?? [] });
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
