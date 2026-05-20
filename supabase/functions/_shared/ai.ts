// Provider abstraction for the edge functions.
// All AI calls go through these functions so we can swap providers
// (price hike, outage, A/B) by changing one file.

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

// ----------------------------------------------------------------
// Gemini — used for vision (OCR) and cheap text generation
// ----------------------------------------------------------------

const GEMINI_MODEL_VISION = 'gemini-2.5-flash';
const GEMINI_MODEL_TEXT = 'gemini-2.5-flash';

export async function geminiVision(
  imageBase64: string,
  mimeType: string,
  instruction: string,
): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_VISION}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: instruction },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini vision failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export async function geminiText(
  prompt: string,
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_TEXT}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.3,
          maxOutputTokens: opts.maxTokens ?? 2048,
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini text failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ----------------------------------------------------------------
// Claude — used for higher-quality flashcards, quiz, and chat
// ----------------------------------------------------------------

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

export async function claudeText(
  prompt: string,
  opts: {
    system?: string;
    temperature?: number;
    maxTokens?: number;
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  } = {},
): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');

  const messages =
    opts.messages ?? [{ role: 'user' as const, content: prompt }];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.3,
      system: opts.system,
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

// ----------------------------------------------------------------
// JSON extraction helper — models sometimes wrap JSON in markdown fences
// ----------------------------------------------------------------
export function extractJSON<T = unknown>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('No JSON object found in model output');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
