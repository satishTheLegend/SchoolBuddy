// Multi-page capture: bundle several photos into a single capture row.
//
// Each image is uploaded to `{userId}/{captureId}/page-{i}.jpg`. The
// `image_url` on the capture row is set to the first page so the existing
// detail screen still has a thumbnail. The page count / paths live in a new
// JSONB column `pages` so the edge function can OCR each page and concatenate
// the raw_text with explicit `\n\n--- Page N ---\n\n` separators.
//
// REQUIRED MIGRATION (run once in Supabase SQL editor):
//   ALTER TABLE public.captures
//     ADD COLUMN IF NOT EXISTS pages jsonb NOT NULL DEFAULT '[]'::jsonb;
//
// The `pages` array stores objects like:
//   [{ "index": 0, "path": "<userId>/<captureId>/page-0.jpg" }, ...]
//
// Note: the existing `generate-kit` edge function must be updated to look
// at `pages` (and fall back to `image_url` when it is empty) for OCR.

import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { prepareImage } from './capture';

const STORAGE_BUCKET = 'captures';

export async function uploadMultiCapture(
  userId: string,
  localUris: string[],
): Promise<{ captureId: string; pages: number }> {
  if (!localUris.length) throw new Error('No pages to upload');

  // Create the capture row first to get a server-side id.
  const { data: created, error: createErr } = await supabase
    .from('captures')
    .insert({ user_id: userId, status: 'pending' })
    .select('id')
    .single();
  if (createErr || !created) throw createErr ?? new Error('insert failed');

  const captureId = created.id as string;
  const pages: Array<{ index: number; path: string }> = [];

  for (let i = 0; i < localUris.length; i++) {
    const { uri, mime } = await prepareImage(localUris[i]);
    const storagePath = `${userId}/${captureId}/page-${i}.jpg`;

    const fileBytes = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const blob = base64ToBlob(fileBytes, mime);

    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, blob, { contentType: mime, upsert: true });
    if (upErr) throw upErr;

    pages.push({ index: i, path: storagePath });
  }

  // Persist the page manifest plus a top-level image_url pointing at page 0
  // so the existing detail UI still finds a preview thumbnail.
  const { error: updErr } = await supabase
    .from('captures')
    .update({
      image_url: pages[0].path,
      pages,
    })
    .eq('id', captureId);
  if (updErr) throw updErr;

  return { captureId, pages: pages.length };
}

function base64ToBlob(base64: string, mime: string): Blob {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}
