// Capture-side helpers: upload an image to Supabase Storage, kick off the
// generate-kit edge function, and subscribe to progressive updates.

import * as FileSystem from 'expo-file-system';
import { supabase, invokeFn } from './supabase';
import { prepareForUpload } from './image-prep';
import { track } from './analytics';
import type { Capture, Card, Summary, Quiz } from '@/types';

const STORAGE_BUCKET = 'captures';

export interface UploadResult {
  storagePath: string;
  captureId: string;
}

export async function uploadCapture(
  userId: string,
  localUri: string,
): Promise<UploadResult> {
  const prepared = await prepareForUpload(localUri);

  // Reserve a server-side capture id by inserting an empty row.
  const { data: created, error: createErr } = await supabase
    .from('captures')
    .insert({ user_id: userId, status: 'pending' })
    .select('id')
    .single();
  if (createErr || !created) throw createErr ?? new Error('insert failed');

  const captureId = created.id as string;
  const storagePath = `${userId}/${captureId}.jpg`;

  // Get a fresh access token for the Storage REST endpoint. Using
  // FileSystem.uploadAsync streams the file from disk so we don't blow
  // memory on large captures.
  const { data: session } = await supabase.auth.getSession();
  const accessToken = session.session?.access_token;
  if (!accessToken) throw new Error('Not signed in');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${storagePath}`;

  const uploadRes = await FileSystem.uploadAsync(uploadUrl, prepared.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': prepared.mime,
      'x-upsert': 'true',
    },
  });

  if (uploadRes.status >= 300) {
    throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.body}`);
  }

  await supabase
    .from('captures')
    .update({ image_url: storagePath })
    .eq('id', captureId);

  track('capture_uploaded', {
    width: prepared.width,
    height: prepared.height,
    size_kb: Math.round(prepared.size / 1024),
  });

  return { storagePath, captureId };
}

export async function generateKit(captureId: string): Promise<void> {
  await invokeFn('generate-kit', { captureId });
}

export function subscribeToKit(
  captureId: string,
  handlers: {
    onCapture?: (c: Capture) => void;
    onSummary?: (s: Summary) => void;
    onCards?: (cards: Card[]) => void;
    onQuiz?: (q: Quiz) => void;
  },
): () => void {
  const channel = supabase
    .channel(`kit:${captureId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'captures', filter: `id=eq.${captureId}` },
      (payload) => {
        if (payload.new && handlers.onCapture) {
          handlers.onCapture(mapCapture(payload.new as Record<string, unknown>));
        }
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'summaries',
        filter: `capture_id=eq.${captureId}`,
      },
      (payload) => {
        if (handlers.onSummary && payload.new) {
          const row = payload.new as Record<string, unknown>;
          handlers.onSummary({
            id: row.id as string,
            captureId: row.capture_id as string,
            content: row.content as string,
            viewMode: row.view_mode as 'bullets' | 'paragraph',
          });
        }
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'quizzes',
        filter: `capture_id=eq.${captureId}`,
      },
      (payload) => {
        if (handlers.onQuiz && payload.new) {
          const row = payload.new as Record<string, unknown>;
          handlers.onQuiz({
            id: row.id as string,
            captureId: row.capture_id as string,
            userId: row.user_id as string,
            questions: row.questions as Quiz['questions'],
            createdAt: row.created_at as string,
          });
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
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
