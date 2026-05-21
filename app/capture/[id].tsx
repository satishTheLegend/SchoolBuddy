import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card, CardSubtitle, CardTitle } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { subscribeToKit } from '@/lib/capture';
import type {
  Capture,
  Card as FlashCard,
  Quiz,
  Summary,
} from '@/types';

type Phase = 'pending' | 'extracting' | 'generating' | 'ready' | 'failed';

export default function CaptureDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [capture, setCapture] = useState<Capture | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [summaryMode, setSummaryMode] = useState<'bullets' | 'paragraph'>('bullets');

  // Load initial state
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: cap } = await supabase
        .from('captures')
        .select('*')
        .eq('id', id)
        .single();
      if (cap) setCapture(mapCapture(cap));

      const { data: sum } = await supabase
        .from('summaries')
        .select('*')
        .eq('capture_id', id)
        .maybeSingle();
      if (sum)
        setSummary({
          id: sum.id,
          captureId: sum.capture_id,
          content: sum.content,
          viewMode: sum.view_mode,
        });

      const { data: cs } = await supabase
        .from('cards')
        .select('*')
        .eq('capture_id', id);
      if (cs) setCards(cs.map(mapCard));

      const { data: q } = await supabase
        .from('quizzes')
        .select('*')
        .eq('capture_id', id)
        .maybeSingle();
      if (q)
        setQuiz({
          id: q.id,
          captureId: q.capture_id,
          userId: q.user_id,
          questions: q.questions,
          createdAt: q.created_at,
        });
    })();
  }, [id]);

  // Subscribe to progressive updates
  useEffect(() => {
    if (!id) return;
    const off = subscribeToKit(id, {
      onCapture: setCapture,
      onSummary: setSummary,
      onQuiz: setQuiz,
    });
    return off;
  }, [id]);

  // Cards arrive via row inserts on `cards` — separate subscription
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`cards:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cards',
          filter: `capture_id=eq.${id}`,
        },
        (payload) => {
          const next = mapCard(payload.new as Record<string, unknown>);
          setCards((prev) =>
            prev.some((c) => c.id === next.id) ? prev : [...prev, next],
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id]);

  const phase: Phase =
    (capture?.status as Phase | undefined) ?? 'extracting';

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="px-4 py-4 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()}>
          <Text className="text-ink-muted text-base">Close</Text>
        </Pressable>
        <PhaseBadge phase={phase} />
        <View className="w-12" />
      </View>

      <ScrollView contentContainerClassName="px-4 pb-12 gap-4">
        {/* Summary */}
        <Card>
          <View className="flex-row items-center justify-between">
            <CardTitle>Summary</CardTitle>
            {summary && (
              <Pressable
                onPress={() => setSummaryMode((m) => (m === 'bullets' ? 'paragraph' : 'bullets'))}
                className="bg-bg-elevated rounded-full px-3 py-1"
              >
                <Text className="text-ink-muted text-xs">
                  {summaryMode === 'bullets' ? 'Paragraph' : 'Bullets'}
                </Text>
              </Pressable>
            )}
          </View>
          {summary ? (
            <Text className="text-ink text-base leading-6 mt-2">
              {summaryMode === 'paragraph' ? summary.content.replace(/^[-*•]\s*/gm, '') : summary.content}
            </Text>
          ) : (
            <PendingRow label="Reading your notes..." />
          )}
        </Card>

        {/* Cards */}
        <Card>
          <CardTitle>
            Flashcards {cards.length > 0 ? `(${cards.length})` : ''}
          </CardTitle>
          {cards.length === 0 ? (
            <PendingRow label="Generating cards..." />
          ) : (
            <View className="mt-2 gap-3">
              {cards.slice(0, 5).map((c) => (
                <View key={c.id} className="border-l-2 border-accent pl-3 py-1">
                  <Text className="text-ink font-medium">{c.front}</Text>
                  <Text className="text-ink-muted text-sm mt-1">{c.back}</Text>
                </View>
              ))}
              {cards.length > 5 && (
                <CardSubtitle>+ {cards.length - 5} more</CardSubtitle>
              )}
            </View>
          )}
        </Card>

        {/* Quiz */}
        <Card>
          <CardTitle>Practice quiz</CardTitle>
          {!quiz ? (
            <PendingRow label="Writing questions..." />
          ) : (
            <View className="mt-2 gap-2">
              <CardSubtitle>
                {quiz.questions.length} questions ready
              </CardSubtitle>
              <View className="mt-2">
                <Button
                  label="Start quiz"
                  onPress={() => router.push(`/quiz/${quiz.id}`)}
                />
              </View>
            </View>
          )}
        </Card>

        {phase === 'ready' && cards.length > 0 && (
          <View className="mt-2 gap-3">
            <Button
              label="Review these cards now"
              size="lg"
              onPress={() => {
                if (capture?.deckId) {
                  router.replace(`/review/${capture.deckId}`);
                }
              }}
            />
            <Button
              label="Ask a follow-up"
              variant="secondary"
              onPress={() => router.push(`/ask/${id}`)}
            />
            <Button
              label="Edit OCR text"
              variant="ghost"
              onPress={() => router.push(`/capture/${id}_edit`)}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PhaseBadge({ phase }: { phase: Phase }) {
  const map: Record<Phase, { label: string; color: string }> = {
    pending: { label: 'Queued', color: 'bg-ink-dim' },
    extracting: { label: 'Reading', color: 'bg-warning' },
    generating: { label: 'Generating', color: 'bg-accent' },
    ready: { label: 'Ready', color: 'bg-success' },
    failed: { label: 'Failed', color: 'bg-danger' },
  };
  const cfg = map[phase];
  return (
    <View className={`${cfg.color} rounded-full px-3 py-1`}>
      <Text className="text-white text-xs font-semibold">{cfg.label}</Text>
    </View>
  );
}

function PendingRow({ label }: { label: string }) {
  return (
    <View className="flex-row items-center mt-2">
      <ActivityIndicator color="#7C5CFF" size="small" />
      <Text className="text-ink-muted ml-2">{label}</Text>
    </View>
  );
}

function mapCapture(row: Record<string, unknown>): Capture {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    deckId: (row.deck_id as string) ?? null,
    imageUrl: (row.image_url as string) ?? null,
    rawText: (row.raw_text as string) ?? null,
    status: row.status as Capture['status'],
    errorMessage: (row.error_message as string) ?? null,
    createdAt: row.created_at as string,
  };
}

function mapCard(row: Record<string, unknown>): FlashCard {
  return {
    id: row.id as string,
    deckId: row.deck_id as string,
    captureId: (row.capture_id as string) ?? null,
    userId: row.user_id as string,
    front: row.front as string,
    back: row.back as string,
    type: (row.type as FlashCard['type']) ?? 'basic',
    stability: (row.stability as number) ?? 0,
    difficulty: (row.difficulty as number) ?? 0,
    dueAt: row.due_at as string,
    lastReviewedAt: (row.last_reviewed_at as string) ?? null,
    reps: (row.reps as number) ?? 0,
    lapses: (row.lapses as number) ?? 0,
    state: (row.state as FlashCard['state']) ?? 'new',
    suspended: (row.suspended as boolean) ?? false,
    starred: (row.starred as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
