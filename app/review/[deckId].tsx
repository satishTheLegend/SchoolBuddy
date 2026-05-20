import { useEffect, useMemo } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { RatingButtons } from '@/components/RatingButtons';
import { useAuth } from '@/stores/auth';
import { useReview } from '@/stores/review';
import {
  DEFAULT_PARAMETERS,
  previewIntervals,
  FsrsCard,
} from '@/lib/fsrs';

export default function ReviewScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const { current, queue, completed, revealed, loading, load, reveal, rate, reset } =
    useReview();

  // 'all' is a sentinel passed by the Today screen to review across all decks.
  const targetDeck = deckId === 'all' ? null : (deckId ?? null);

  useEffect(() => {
    if (!user) return;
    load(user.id, targetDeck);
    return () => reset();
  }, [user?.id, targetDeck, load, reset]);

  const remaining = queue.length + (current ? 1 : 0);

  const preview = useMemo(() => {
    if (!current) return null;
    const fsrs: FsrsCard = {
      stability: current.stability,
      difficulty: current.difficulty,
      due: new Date(current.dueAt),
      lastReview: current.lastReviewedAt
        ? new Date(current.lastReviewedAt)
        : null,
      reps: current.reps,
      lapses: current.lapses,
      state: current.state,
    };
    return previewIntervals(fsrs, new Date(), DEFAULT_PARAMETERS);
  }, [current]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#7C5CFF" />
      </SafeAreaView>
    );
  }

  if (!current) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-8">
        <Text className="text-ink text-3xl font-bold mb-2">
          {completed > 0 ? 'Done for now' : 'Nothing to review'}
        </Text>
        <Text className="text-ink-muted text-center mb-8">
          {completed > 0
            ? `You reviewed ${completed} cards. Come back tomorrow — that's how spacing works.`
            : 'No cards are due in this deck.'}
        </Text>
        <Button label="Back" onPress={() => router.back()} size="lg" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-row px-4 py-3 items-center justify-between">
        <Pressable onPress={() => router.back()}>
          <Text className="text-ink-muted">Close</Text>
        </Pressable>
        <Text className="text-ink-muted text-sm">
          {completed + 1} / {completed + remaining}
        </Text>
        <View className="w-12" />
      </View>

      <Pressable
        onPress={() => !revealed && reveal()}
        className="flex-1 px-6 justify-center"
      >
        <View className="bg-bg-card rounded-3xl p-6 min-h-[60%] justify-center">
          <Text className="text-ink text-2xl font-medium text-center leading-9">
            {current.front}
          </Text>
          {revealed && (
            <>
              <View className="h-px bg-bg-elevated my-6" />
              <Text className="text-ink-muted text-xl text-center leading-8">
                {current.back}
              </Text>
            </>
          )}
        </View>
        {!revealed && (
          <Text className="text-ink-dim text-center mt-6">
            Tap card to reveal answer
          </Text>
        )}
      </Pressable>

      {revealed && preview && (
        <RatingButtons onRate={(r) => rate(r)} previewDays={preview} />
      )}
    </SafeAreaView>
  );
}
