import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Card, CardSubtitle, CardTitle } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/stores/auth';
import { searchCards, searchCaptures } from '@/lib/search';
import type { Card as CardType, Capture } from '@/types';

type Tab = 'cards' | 'notes';

const DEBOUNCE_MS = 300;

export default function SearchScreen() {
  const user = useAuth((s) => s.user);
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [tab, setTab] = useState<Tab>('cards');

  const [cards, setCards] = useState<CardType[]>([]);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);
  const reqId = useRef(0);

  // Autofocus the input when the screen mounts.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // Debounce the query so we don't hammer Supabase on each keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch whenever the debounced query or user changes. We guard against
  // out-of-order responses with an incrementing request id.
  useEffect(() => {
    if (!user?.id || !debounced) {
      setCards([]);
      setCaptures([]);
      setLoading(false);
      setError(null);
      return;
    }
    const myId = ++reqId.current;
    setLoading(true);
    setError(null);
    Promise.all([
      searchCards(user.id, debounced),
      searchCaptures(user.id, debounced),
    ])
      .then(([c, p]) => {
        if (myId !== reqId.current) return;
        setCards(c);
        setCaptures(p);
      })
      .catch((e) => {
        if (myId !== reqId.current) return;
        setError(e instanceof Error ? e.message : 'Search failed');
      })
      .finally(() => {
        if (myId !== reqId.current) return;
        setLoading(false);
      });
  }, [user?.id, debounced]);

  const counts = useMemo(
    () => ({ cards: cards.length, notes: captures.length }),
    [cards.length, captures.length],
  );

  const showEmptyQuery = !debounced;
  const showLoading = loading && debounced.length > 0;
  const activeEmpty =
    !showLoading &&
    !showEmptyQuery &&
    (tab === 'cards' ? cards.length === 0 : captures.length === 0);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']} style={{ backgroundColor: '#0B0F19' }}>
      <View className="px-4 pt-6 pb-3">
        <Text className="text-ink text-3xl font-bold mb-4">Search</Text>

        <View
          className="rounded-2xl px-4 py-3"
          style={{ backgroundColor: '#1A2236' }}
        >
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search cards and notes"
            placeholderTextColor="#6B7280"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={{ color: '#F3F4F6', fontSize: 16 }}
          />
        </View>

        <View className="flex-row mt-4 gap-2">
          <TabButton
            label={`Cards${debounced && !loading ? ` (${counts.cards})` : ''}`}
            active={tab === 'cards'}
            onPress={() => setTab('cards')}
          />
          <TabButton
            label={`Notes${debounced && !loading ? ` (${counts.notes})` : ''}`}
            active={tab === 'notes'}
            onPress={() => setTab('notes')}
          />
        </View>
      </View>

      {showEmptyQuery ? (
        <EmptyState
          title="Search your library"
          body="Find any card or note by keyword. Semantic search is coming soon."
        />
      ) : showLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#7C5CFF" />
        </View>
      ) : error ? (
        <EmptyState title="Something went wrong" body={error} />
      ) : activeEmpty ? (
        <EmptyState
          title="No matches"
          body={`No ${tab === 'cards' ? 'cards' : 'notes'} matched "${debounced}".`}
        />
      ) : tab === 'cards' ? (
        <FlatList
          data={cards}
          keyExtractor={(c) => c.id}
          contentContainerClassName="px-4 pb-12 gap-3"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/deck/${item.deckId}`)}>
              <CardTitle>{item.front}</CardTitle>
              <CardSubtitle>{item.back}</CardSubtitle>
            </Card>
          )}
        />
      ) : (
        <FlatList
          data={captures}
          keyExtractor={(c) => c.id}
          contentContainerClassName="px-4 pb-12 gap-3"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/capture/${item.id}`)}>
              <CardTitle>{snippet(item.rawText, debounced)}</CardTitle>
              <CardSubtitle>
                {new Date(item.createdAt).toLocaleDateString()}
              </CardSubtitle>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full px-4 py-2 active:opacity-70"
      style={{
        backgroundColor: active ? '#7C5CFF' : '#1A2236',
      }}
    >
      <Text
        style={{
          color: active ? '#FFFFFF' : '#9CA3AF',
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// Build a short snippet around the first match for nicer result display.
function snippet(text: string | null, query: string): string {
  if (!text) return '(no text)';
  if (!query) return text.slice(0, 120);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, 120);
  const start = Math.max(0, idx - 30);
  const end = Math.min(text.length, idx + query.length + 90);
  const prefix = start > 0 ? '... ' : '';
  const suffix = end < text.length ? ' ...' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`;
}
