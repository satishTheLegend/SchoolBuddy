// Text-only capture: skip the OCR step, go straight to AI generation.
// Used when a student pastes notes from another app, or types something.

import { supabase, invokeFn } from './supabase';

export async function createTextCapture(
  userId: string,
  text: string,
): Promise<string> {
  const trimmed = text.trim();
  if (trimmed.length < 20) {
    throw new Error('Paste at least a paragraph (20+ characters).');
  }
  const { data, error } = await supabase
    .from('captures')
    .insert({
      user_id: userId,
      raw_text: trimmed,
      status: 'generating',
    })
    .select('id')
    .single();
  if (error || !data) throw error ?? new Error('Insert failed');
  return data.id;
}

export async function generateFromText(captureId: string): Promise<void> {
  // The generate-kit edge function handles both image-with-OCR and
  // pre-populated raw_text captures (it skips OCR when raw_text is set).
  await invokeFn('generate-kit', { captureId });
}
