// Search helpers — full-text (ILIKE) over cards/captures with a stub for
// semantic search. The semantic path will eventually call an edge function
// that embeds the user's query (same model as ingestion) and runs a
// pgvector cosine-similarity query against `public.embeddings`.

import { supabase, invokeFn } from './supabase';
import type { Card, Capture } from '@/types';

function escapeIlike(query: string): string {
  // Escape Postgres LIKE wildcards so user input is treated literally.
  return query.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function mapCard(row: Record<string, unknown>): Card {
  return {
    id: row.id as string,
    deckId: row.deck_id as string,
    captureId: (row.capture_id as string) ?? null,
    userId: row.user_id as string,
    front: row.front as string,
    back: row.back as string,
    type: row.type as Card['type'],
    stability: (row.stability as number) ?? 0,
    difficulty: (row.difficulty as number) ?? 0,
    dueAt: row.due_at as string,
    lastReviewedAt: (row.last_reviewed_at as string) ?? null,
    reps: (row.reps as number) ?? 0,
    lapses: (row.lapses as number) ?? 0,
    state: row.state as Card['state'],
    suspended: row.suspended as boolean,
    starred: row.starred as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapCapture(row: Record<string, unknown>): Capture {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    deckId: (row.deck_id as string) ?? null,
    imageUrl: (row.image_url as string) ?? null,
    rawText: (row.raw_text as string) ?? null,
    status: row.status as Capture['status'],
    errorMessage: (row.error_message as string) ?? null,
    createdAt: row.created_at as string,
  };
}

/**
 * Full-text search across a user's cards using Postgres ILIKE on
 * `front` OR `back`. RLS still scopes results to the caller's rows but we
 * also filter by user_id for index use.
 */
export async function searchCards(
  userId: string,
  query: string,
): Promise<Card[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const pattern = `%${escapeIlike(trimmed)}%`;
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', userId)
    .or(`front.ilike.${pattern},back.ilike.${pattern}`)
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(mapCard);
}

/**
 * Full-text search across a user's captures using ILIKE on `raw_text`.
 */
export async function searchCaptures(
  userId: string,
  query: string,
): Promise<Capture[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const pattern = `%${escapeIlike(trimmed)}%`;
  const { data, error } = await supabase
    .from('captures')
    .select('*')
    .eq('user_id', userId)
    .ilike('raw_text', pattern)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(mapCapture);
}

export interface SemanticHit {
  ownerTable: 'captures' | 'cards' | 'summaries';
  ownerId: string;
  snippet: string;
  similarity: number;
}

/**
 * Semantic search via the `semantic-search` edge function. The function
 * embeds the query with the same model used at ingestion (Gemini
 * text-embedding-004) and runs cosine similarity through the
 * `match_embeddings` RPC against the calling user's embeddings.
 */
export async function semanticSearch(
  query: string,
  limit = 20,
  ownerTable?: 'captures' | 'cards' | 'summaries',
): Promise<SemanticHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const res = await invokeFn<{
    results?: Array<{
      owner_table: SemanticHit['ownerTable'];
      owner_id: string;
      content: string;
      similarity: number;
    }>;
  }>('semantic-search', { query: trimmed, limit, ownerTable });
  return (res?.results ?? []).map((r) => ({
    ownerTable: r.owner_table,
    ownerId: r.owner_id,
    snippet: r.content?.slice(0, 200) ?? '',
    similarity: r.similarity,
  }));
}
