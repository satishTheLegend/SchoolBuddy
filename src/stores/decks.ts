import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Deck } from '@/types';

interface DecksState {
  decks: Deck[];
  loading: boolean;
  load: (userId: string) => Promise<void>;
  create: (userId: string, title: string, color?: string) => Promise<Deck>;
  rename: (id: string, title: string) => Promise<void>;
  archive: (id: string) => Promise<void>;
}

function mapDeck(row: Record<string, unknown>): Deck {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    color: (row.color as string) ?? '#7C5CFF',
    archived: row.archived as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const useDecks = create<DecksState>((set, get) => ({
  decks: [],
  loading: false,

  load: async (userId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .eq('archived', false)
      .order('updated_at', { ascending: false });
    if (!error) set({ decks: (data ?? []).map(mapDeck) });
    set({ loading: false });
  },

  create: async (userId, title, color = '#7C5CFF') => {
    const { data, error } = await supabase
      .from('decks')
      .insert({ user_id: userId, title, color })
      .select('*')
      .single();
    if (error) throw error;
    const deck = mapDeck(data);
    set({ decks: [deck, ...get().decks] });
    return deck;
  },

  rename: async (id, title) => {
    await supabase.from('decks').update({ title }).eq('id', id);
    set({
      decks: get().decks.map((d) => (d.id === id ? { ...d, title } : d)),
    });
  },

  archive: async (id) => {
    await supabase.from('decks').update({ archived: true }).eq('id', id);
    set({ decks: get().decks.filter((d) => d.id !== id) });
  },
}));
