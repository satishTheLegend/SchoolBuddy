import { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Card, CardSubtitle, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { StreakBadge } from '@/components/StreakBadge';
import { useAuth } from '@/stores/auth';
import { countDue } from '@/lib/db/client';
import { fullSync } from '@/lib/db/sync';
import { getStreak } from '@/lib/streak';

export default function TodayScreen() {
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const [dueCount, setDueCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await fullSync(user.id);
      const [n, s] = await Promise.all([countDue(user.id, null), getStreak()]);
      setDueCount(n);
      setStreak(s.count);
    } catch (e) {
      console.warn('refresh failed', e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [user?.id]);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-6"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#7C5CFF"
          />
        }
      >
        <View className="mb-6 flex-row items-start justify-between">
          <View>
            <Text className="text-ink-muted text-sm mb-1">Today</Text>
            <Text className="text-ink text-3xl font-bold">
              {dueCount > 0 ? `${dueCount} cards due` : 'All caught up'}
            </Text>
          </View>
          {streak > 0 && <StreakBadge count={streak} />}
        </View>

        {dueCount > 0 ? (
          <Card className="mb-4">
            <CardTitle>Daily review</CardTitle>
            <CardSubtitle>
              Stay on top of what you've learned. ~{Math.ceil(dueCount / 4)} min.
            </CardSubtitle>
            <View className="mt-4">
              <Button
                label={`Start reviewing (${dueCount})`}
                onPress={() => router.push('/review/all')}
                size="lg"
              />
            </View>
          </Card>
        ) : (
          <EmptyState
            title="Nothing due today"
            body="Snap a page of notes to build your first deck — or check back tomorrow."
            action={
              <Button label="Snap a page" onPress={() => router.push('/capture')} />
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
