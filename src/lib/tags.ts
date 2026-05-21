import { supabase } from './supabase';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export async function listTags(userId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('id, name, color')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createTag(
  userId: string,
  name: string,
  color = '#7C5CFF',
): Promise<Tag> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Tag name required');
  const { data, error } = await supabase
    .from('tags')
    .insert({ user_id: userId, name: trimmed, color })
    .select('id, name, color')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTag(tagId: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', tagId);
  if (error) throw error;
}

export async function tagsForCard(cardId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('card_tags')
    .select('tag:tags(id, name, color)')
    .eq('card_id', cardId);
  if (error) throw error;
  return ((data ?? []) as Array<{ tag: Tag }>).map((r) => r.tag);
}

export async function attachTagToCard(
  userId: string,
  cardId: string,
  tagId: string,
): Promise<void> {
  const { error } = await supabase
    .from('card_tags')
    .insert({ user_id: userId, card_id: cardId, tag_id: tagId });
  if (error && error.code !== '23505') throw error; // ignore unique-violation
}

export async function detachTagFromCard(
  cardId: string,
  tagId: string,
): Promise<void> {
  const { error } = await supabase
    .from('card_tags')
    .delete()
    .eq('card_id', cardId)
    .eq('tag_id', tagId);
  if (error) throw error;
}

export async function tagsForCapture(captureId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('capture_tags')
    .select('tag:tags(id, name, color)')
    .eq('capture_id', captureId);
  if (error) throw error;
  return ((data ?? []) as Array<{ tag: Tag }>).map((r) => r.tag);
}

export async function attachTagToCapture(
  userId: string,
  captureId: string,
  tagId: string,
): Promise<void> {
  const { error } = await supabase
    .from('capture_tags')
    .insert({ user_id: userId, capture_id: captureId, tag_id: tagId });
  if (error && error.code !== '23505') throw error;
}

export async function detachTagFromCapture(
  captureId: string,
  tagId: string,
): Promise<void> {
  const { error } = await supabase
    .from('capture_tags')
    .delete()
    .eq('capture_id', captureId)
    .eq('tag_id', tagId);
  if (error) throw error;
}

export async function listCardsWithTag(
  userId: string,
  tagId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('card_tags')
    .select('card_id')
    .eq('user_id', userId)
    .eq('tag_id', tagId);
  if (error) throw error;
  return (data ?? []).map((r) => r.card_id);
}
