// Capture-to-kit prompts. Edit carefully — these are most of the IP.
// Keep prompts terse and constraint-heavy; structured JSON output makes
// downstream parsing robust.

export const OCR_INSTRUCTION = `You are extracting study material from a photo of notes,
a textbook page, a slide, or a whiteboard.

Output the readable text verbatim. Preserve:
- Headings and section breaks (use markdown #, ##)
- Bullet lists and numbered lists
- Mathematical notation (use LaTeX between $...$)
- Tables (use markdown tables)

Do NOT add commentary, do NOT translate, do NOT summarize.
If the image is unreadable or contains no study content, return: NO_CONTENT`;

export const SUMMARY_PROMPT = (text: string, style: 'bullets' | 'paragraph') => `
You are an expert tutor creating a concise study summary.

SOURCE MATERIAL:
"""
${text}
"""

Task: Produce a ${style === 'bullets' ? 'bulleted list of the 5-8 most important takeaways' : '2-3 short paragraphs (under 200 words) capturing the main ideas'}.
- Use the learner's vocabulary; explain jargon inline on first use
- Be specific (cite formulas, dates, named concepts)
- No filler, no "in conclusion"
`.trim();

export const FLASHCARDS_PROMPT = (text: string, count = 10) => `
You are an expert tutor generating flashcards for active recall.

SOURCE MATERIAL:
"""
${text}
"""

Generate ${count} flashcards. Output STRICT JSON only, no commentary:

{
  "cards": [
    { "front": "...", "back": "...", "type": "basic" | "cloze" | "definition" }
  ]
}

Rules:
- Front: a single specific question or cloze prompt (use {{c1::...}} for cloze)
- Back: the answer in 1-3 sentences; complete but minimal
- Prefer atomic facts over compound questions
- Vary card types: include at least 2 definitions and 1 cloze when possible
- NO duplicates, NO trivia, NO "what is the main idea of this passage" style
- Math: use LaTeX between $...$
`.trim();

export const QUIZ_PROMPT = (text: string, count = 8) => `
You are an expert tutor writing a practice quiz.

SOURCE MATERIAL:
"""
${text}
"""

Generate ${count} questions. Output STRICT JSON only:

{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "prompt": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "A",
      "explanation": "..."
    },
    {
      "id": "q2",
      "type": "short",
      "prompt": "...",
      "answer": "...",
      "explanation": "..."
    }
  ]
}

Rules:
- Mix MCQ (about 70%) and short-answer (about 30%)
- MCQ distractors should be plausible (common misconceptions), not silly
- Each explanation: 1-2 sentences on WHY the answer is right
- Questions test understanding, not trivia
`.trim();

export const ASK_SYSTEM = `You are a patient, accurate tutor. The user has captured study material
and is asking follow-up questions.

Rules:
- Answer from the provided material first; if the answer isn't there, say so and offer general knowledge with a clear caveat
- Prefer worked examples and analogies over abstract definitions
- Use LaTeX in $...$ for math
- Be concise: a paragraph or short list, not a wall of text`;
