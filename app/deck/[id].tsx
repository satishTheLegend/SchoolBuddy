import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card as UICard, CardSubtitle, CardTitle } from '@/components/Card';
import { useAuth } from '@/stores/auth';
import { getDeckCards, countDue } from '@/lib/db/client';
import { Card } from '@/types';

export default function DeckDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [cards, setCards] = useState<Card[]>([]);
  const [due, setDue] = useState(0);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const cs = await getDeckCards(user.id, id);
      setCards(cs);
      setDue(await countDue(id));
    })();
  }, [user?.id, id]);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="px-4 pt-4 pb-3 flex-row items-center">
        <Pressable onPress={() => router.back()}>
          <Text className="text-accent text-base">Back</Text>
        </Pressable>
      </View>

      <View className="px-4 pb-4">
        <Text className="text-ink text-3xl font-bold mb-1">Deck</Text>
        <Text className="text-ink-muted text-base">
          {cards.length} cards · {due} due
        </Text>
        <View className="mt-4">
          <Button
            label={due > 0 ? `Review ${due} cards` : 'Nothing due'}
            disabled={due === 0}
            onPress={() => router.push(`/review/${id}`)}
            size="lg"
          />
        </View>
      </View>

      <FlatList
        data={cards}
        keyExtractor={(c) => c.id}
        contentContainerClassName="px-4 pb-12 gap-2"
        renderItem={({ item }) => (
          <UICard>
            <CardTitle>{item.front}</CardTitle>
            <CardSubtitle>{item.back}</CardSubtitle>
            <Text className="text-ink-dim text-xs mt-2">
              state: {item.state} · reps: {item.reps} · due:{' '}
              {new Date(item.dueAt).toLocaleDateString()}
            </Text>
          </UICard>
        )}
        ListEmptyComponent={
          <Text className="text-ink-muted text-center mt-12">
            No cards in this deck yet.
          </Text>
        }
      />
    </SafeAreaView>
  );
}
