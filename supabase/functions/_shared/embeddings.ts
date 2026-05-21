// Embedding provider abstraction.
// Default: Gemini text-embedding-004 (768 dim, matches the pgvector
// column declared in supabase/migrations/0001_initial.sql).

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODEL = 'text-embedding-004';

export async function geminiEmbed(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Embed failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.embedding?.values ?? [];
}

// SHA-256 hash → hex, used as content_hash for de-duplication.
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const bytesOut = new Uint8Array(hash);
  return Array.from(bytesOut, (b) => b.toString(16).padStart(2, '0')).join('');
}
