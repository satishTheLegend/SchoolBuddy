// Thin wrapper around the `ask` edge function. Sends the running
// conversation history along with the capture id and returns the
// assistant's next reply.

import { invokeFn } from './supabase';

export type AskRole = 'user' | 'assistant';

export interface AskMessage {
  role: AskRole;
  content: string;
}

export interface AskRequest {
  captureId: string;
  messages: AskMessage[];
}

export interface AskResponse {
  reply: string;
}

export async function ask(
  captureId: string,
  messages: AskMessage[],
): Promise<string> {
  const data = await invokeFn<AskResponse>('ask', {
    captureId,
    messages,
  } satisfies AskRequest);
  return data.reply;
}
