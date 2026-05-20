// POST /functions/v1/generate-kit
//
// Body: { captureId: string }
// Auth: user JWT in Authorization header
//
// Pipeline:
//   1. Load capture; verify ownership
//   2. Download image from Supabase Storage
//   3. Run Gemini vision OCR -> raw text
//   4. In parallel: summary (Gemini), flashcards (Claude), quiz (Claude)
//   5. Persist outputs and update capture status to 'ready'
//
// Realtime listeners on the client subscribe to updates on captures,
// summaries, cards, and quizzes for progressive reveal.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import {
  claudeText,
  extractJSON,
  geminiText,
  geminiVision,
} from '../_shared/ai.ts';
import {
  FLASHCARDS_PROMPT,
  OCR_INSTRUCTION,
  QUIZ_PROMPT,
  SUMMARY_PROMPT,
} from '../_shared/prompts.ts';

interface RequestBody {
  captureId: string;
}

interface CardJSON {
  front: string;
  back: string;
  type: 'basic' | 'cloze' | 'definition';
}

interface QuestionJSON {
  id: string;
  type: 'mcq' | 'short';
  prompt: string;
  options?: string[];
  answer: string;
  explanation: string;
}

Deno.serve(async (req: Request) => {
  const cors = handleOptions(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    const { captureId } = (await req.json()) as RequestBody;
    if (!captureId) return json({ error: 'captureId required' }, 400);

    // Client bound to the user's JWT — RLS applies
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // Service-role client for writes that need to bypass RLS for summaries etc.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: capture, error: captureErr } = await userClient
      .from('captures')
      .select('id, user_id, deck_id, image_url, raw_text, status')
      .eq('id', captureId)
      .single();

    if (captureErr || !capture) {
      return json({ error: 'Capture not found' }, 404);
    }

    // Mark as extracting
    await adminClient
      .from('captures')
      .update({ status: 'extracting' })
      .eq('id', captureId);

    // ----------------------------------------------------------------
    // 1. OCR
    // ----------------------------------------------------------------
    let rawText = capture.raw_text;
    if (!rawText && capture.image_url) {
      const { data: file, error: dlErr } = await adminClient.storage
        .from('captures')
        .download(capture.image_url);

      if (dlErr || !file) {
        await markFailed(adminClient, captureId, `Download failed: ${dlErr?.message}`);
        return json({ error: 'Image download failed' }, 500);
      }

      const buf = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(buf);
      const mime = file.type || 'image/jpeg';

      rawText = await geminiVision(base64, mime, OCR_INSTRUCTION);

      if (!rawText || rawText.trim() === 'NO_CONTENT') {
        await markFailed(adminClient, captureId, 'No readable content in image');
        return json({ error: 'No readable content' }, 422);
      }

      await adminClient
        .from('captures')
        .update({ raw_text: rawText, status: 'generating' })
        .eq('id', captureId);
    } else {
      await adminClient
        .from('captures')
        .update({ status: 'generating' })
        .eq('id', captureId);
    }

    // ----------------------------------------------------------------
    // 2. Generation — fan out
    // ----------------------------------------------------------------
    const [summaryText, cardsRaw, quizRaw] = await Promise.allSettled([
      geminiText(SUMMARY_PROMPT(rawText, 'bullets'), { maxTokens: 1500 }),
      claudeText(FLASHCARDS_PROMPT(rawText, 10), { maxTokens: 2500 }),
      claudeText(QUIZ_PROMPT(rawText, 8), { maxTokens: 2500 }),
    ]);

    // Summary
    if (summaryText.status === 'fulfilled') {
      await adminClient.from('summaries').insert({
        capture_id: captureId,
        content: summaryText.value,
        view_mode: 'bullets',
      });
    }

    // Cards — ensure a deck. Find-or-create the user's "Inbox" deck so
    // repeat captures don't pile up into N copies of the same deck.
    let deckId = capture.deck_id;
    if (!deckId) {
      const { data: existing } = await adminClient
        .from('decks')
        .select('id')
        .eq('user_id', capture.user_id)
        .eq('title', 'Inbox')
        .eq('archived', false)
        .maybeSingle();

      if (existing?.id) {
        deckId = existing.id;
      } else {
        const { data: deck } = await adminClient
          .from('decks')
          .insert({ user_id: capture.user_id, title: 'Inbox' })
          .select('id')
          .single();
        deckId = deck?.id;
      }

      if (deckId) {
        await adminClient
          .from('captures')
          .update({ deck_id: deckId })
          .eq('id', captureId);
      }
    }

    if (cardsRaw.status === 'fulfilled' && deckId) {
      try {
        const parsed = extractJSON<{ cards: CardJSON[] }>(cardsRaw.value);
        const rows = parsed.cards.map((c) => ({
          deck_id: deckId,
          capture_id: captureId,
          user_id: capture.user_id,
          front: c.front,
          back: c.back,
          type: c.type ?? 'basic',
        }));
        if (rows.length) {
          await adminClient.from('cards').insert(rows);
        }
      } catch (e) {
        console.error('Cards JSON parse failed', e);
      }
    }

    // Quiz
    if (quizRaw.status === 'fulfilled') {
      try {
        const parsed = extractJSON<{ questions: QuestionJSON[] }>(quizRaw.value);
        await adminClient.from('quizzes').insert({
          capture_id: captureId,
          user_id: capture.user_id,
          questions: parsed.questions,
        });
      } catch (e) {
        console.error('Quiz JSON parse failed', e);
      }
    }

    await adminClient
      .from('captures')
      .update({ status: 'ready' })
      .eq('id', captureId);

    return json({ ok: true, captureId, deckId });
  } catch (e) {
    console.error('generate-kit failed', e);
    return json({ error: (e as Error).message }, 500);
  }
});

// ----------------------------------------------------------------
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function markFailed(
  client: ReturnType<typeof createClient>,
  captureId: string,
  message: string,
) {
  await client
    .from('captures')
    .update({ status: 'failed', error_message: message })
    .eq('id', captureId);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[],
    );
  }
  return btoa(binary);
}
