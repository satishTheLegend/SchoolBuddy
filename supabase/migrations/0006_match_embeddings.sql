-- pgvector cosine-similarity RPC used by the semantic-search edge function.
-- Returns rows ordered by similarity desc, scoped to auth.uid() so RLS
-- doesn't have to be re-checked in the function body.

create or replace function public.match_embeddings(
  query_vec vector(768),
  k integer default 20,
  owner text default null
)
returns table (
  owner_table text,
  owner_id uuid,
  content text,
  similarity float
)
language sql
stable
security invoker
as $$
  select
    e.owner_table,
    e.owner_id,
    e.content,
    1 - (e.embedding <=> query_vec) as similarity
  from public.embeddings e
  where e.user_id = auth.uid()
    and (owner is null or e.owner_table = owner)
  order by e.embedding <=> query_vec
  limit k
$$;
