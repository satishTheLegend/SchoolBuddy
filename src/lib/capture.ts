// Capture-side helpers: upload an image to Supabase Storage, kick off the
// generate-kit edge function, and subscribe to progressive updates.

import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase, invokeFn } from './supabase';
import type { Capture, Card, Summary, Quiz } from '@/types';

const STORAGE_BUCKET = 'captures';
const MAX_DIMENSION = 1600;

// Compress + downscale the photo before upload. Vision token cost scales
// with megapixels — keeping the longest side at ~1600px is a good balance
// between OCR accuracy and cost.
export async function prepareImage(localUri: string): Promise<{
  uri: string;
  mime: string;
}> {
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: result.uri, mime: 'image/jpeg' };
}

export async function uploadCapture(
  userId: string,
  localUri: string,
): Promise<{ storagePath: string; captureId: string }> {
  const { uri, mime } = await prepareImage(localUri);

  // Generate a server-side ID by inserting an empty capture row first.
  const { data: created, error: createErr } = await supabase
    .from('captures')
    .insert({ user_id: userId, status: 'pending' })
    .select('id')
    .single();
  if (createErr || !created) throw createErr ?? new Error('insert failed');

  const captureId = created.id as string;
  const storagePath = `${userId}/${captureId}.jpg`;

  const fileBytes = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const blob = base64ToBlob(fileBytes, mime);

  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, blob, { contentType: mime, upsert: true });
  if (upErr) throw upErr;

  await supabase
    .from('captures')
    .update({ image_url: storagePath })
    .eq('id', captureId);

  return { storagePath, captureId };
}

export async function generateKit(captureId: string): Promise<void> {
  await invokeFn('generate-kit', { captureId });
}

// Subscribe to progressive updates for a capture.
// Cleanup is the caller's responsibility (call the returned unsubscribe).
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

function base64ToBlob(base64: string, mime: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}
