import { useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Card, CardSubtitle, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/stores/auth';
import { useDecks } from '@/stores/decks';

export default function DecksScreen() {
  const user = useAuth((s) => s.user);
  const { decks, loading, load } = useDecks();
  const router = useRouter();

  useEffect(() => {
    if (user?.id) load(user.id);
  }, [user?.id, load]);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="px-4 pt-6 pb-3 flex-row justify-between items-center">
        <Text className="text-ink text-3xl font-bold">Decks</Text>
        <View className="flex-row gap-2">
          <Button
            label="Search"
            size="sm"
            variant="secondary"
            onPress={() => router.push('/search')}
          />
          <Button
            label="Snap"
            size="sm"
            onPress={() => router.push('/capture')}
          />
        </View>
      </View>

      {loading && decks.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#7C5CFF" />
        </View>
      ) : decks.length === 0 ? (
        <EmptyState
          title="No decks yet"
          body="Capture your first page to create one automatically."
          action={
            <Button
              label="Capture a page"
              onPress={() => router.push('/capture')}
            />
          }
        />
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(d) => d.id}
          contentContainerClassName="px-4 pb-12 gap-3"
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/deck/${item.id}`)}>
              <View
                className="w-10 h-10 rounded-lg mb-3"
                style={{ backgroundColor: item.color }}
              />
              <CardTitle>{item.title}</CardTitle>
              <CardSubtitle>Tap to view</CardSubtitle>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}
