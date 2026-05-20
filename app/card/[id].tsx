import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { getDb } from '@/lib/db/client';
import { updateCard, deleteCard, resetCardProgress } from '@/lib/cards';

interface CardRow {
  id: string;
  front: string;
  back: string;
  state: string;
  reps: number;
  due_at: string;
}

export default function CardEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [meta, setMeta] = useState<CardRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const db = getDb();
      const row = await db.getFirstAsync<CardRow>(
        `SELECT id, front, back, state, reps, due_at FROM cards WHERE id = ?`,
        [id],
      );
      if (row) {
        setMeta(row);
        setFront(row.front);
        setBack(row.back);
      }
      setLoading(false);
    })();
  }, [id]);

  const save = async () => {
    if (!id) return;
    if (!front.trim() || !back.trim()) {
      Alert.alert('Missing content', 'Front and back cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await updateCard(id, front.trim(), back.trim());
      router.back();
    } catch (e) {
      Alert.alert('Save failed', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!id) return;
    Alert.alert(
      'Delete card?',
      'This cannot be undone. The card and its review history will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCard(id);
              router.back();
            } catch (e) {
              Alert.alert('Delete failed', (e as Error).message);
            }
          },
        },
      ],
    );
  };

  const confirmReset = () => {
    if (!id) return;
    Alert.alert(
      'Reset progress?',
      'This card will be moved back to "new" and scheduled for review now. Review history is preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetCardProgress(id);
              const db = getDb();
              const row = await db.getFirstAsync<CardRow>(
                `SELECT id, front, back, state, reps, due_at FROM cards WHERE id = ?`,
                [id],
              );
              if (row) setMeta(row);
            } catch (e) {
              Alert.alert('Reset failed', (e as Error).message);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <Text className="text-ink-muted">Loading…</Text>
      </SafeAreaView>
    );
  }

  if (!meta) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <View className="px-4 pt-4">
          <Pressable onPress={() => router.back()}>
            <Text className="text-accent text-base">Back</Text>
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-ink text-xl font-semibold mb-2">Card not found</Text>
          <Text className="text-ink-muted text-center">
            This card may have been deleted or hasn’t synced yet.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
          <Pressable onPress={() => router.back()}>
            <Text className="text-accent text-base">Cancel</Text>
          </Pressable>
          <Text className="text-ink text-base font-semibold">Edit card</Text>
          <View style={{ width: 56 }} />
        </View>

        <ScrollView
          contentContainerClassName="px-6 pb-12"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-ink-muted text-xs mb-6">
            state: {meta.state} · reps: {meta.reps} · due:{' '}
            {new Date(meta.due_at).toLocaleDateString()}
          </Text>

          <View className="gap-4 mb-6">
            <View>
              <Text className="text-ink-muted text-sm mb-2">Front</Text>
              <TextInput
                value={front}
                onChangeText={setFront}
                multiline
                placeholderTextColor="#5B6580"
                placeholder="Question or prompt"
                className="bg-bg-elevated text-ink rounded-xl px-4 py-3 text-base"
                style={{ minHeight: 120, textAlignVertical: 'top' }}
              />
            </View>
            <View>
              <Text className="text-ink-muted text-sm mb-2">Back</Text>
              <TextInput
                value={back}
                onChangeText={setBack}
                multiline
                placeholderTextColor="#5B6580"
                placeholder="Answer"
                className="bg-bg-elevated text-ink rounded-xl px-4 py-3 text-base"
                style={{ minHeight: 160, textAlignVertical: 'top' }}
              />
            </View>
          </View>

          <View className="gap-3">
            <Button label="Save" onPress={save} loading={saving} size="lg" />
            <Button
              label="Cancel"
              onPress={() => router.back()}
              variant="secondary"
              size="lg"
            />
            <Button
              label="Reset progress"
              onPress={confirmReset}
              variant="secondary"
              size="lg"
            />
            <Button
              label="Delete card"
              onPress={confirmDelete}
              variant="danger"
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
