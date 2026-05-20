import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';
import { Quiz } from '@/types';

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .single();
      if (data)
        setQuiz({
          id: data.id,
          captureId: data.capture_id,
          userId: data.user_id,
          questions: data.questions,
          createdAt: data.created_at,
        });
    })();
  }, [id]);

  if (!quiz) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#7C5CFF" />
      </SafeAreaView>
    );
  }

  const q = quiz.questions[idx];
  const isLast = idx === quiz.questions.length - 1;

  const score = quiz.questions.reduce(
    (acc, qq) => acc + (isCorrect(qq, answers[qq.id]) ? 1 : 0),
    0,
  );

  const submit = async () => {
    setSubmitted(true);
    if (user) {
      await supabase.from('quiz_attempts').insert({
        quiz_id: quiz.id,
        user_id: user.id,
        score: score / quiz.questions.length,
        answers,
      });
    }
  };

  if (submitted) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <ScrollView contentContainerClassName="px-4 py-8">
          <Text className="text-ink text-3xl font-bold mb-2">
            {score} / {quiz.questions.length}
          </Text>
          <Text className="text-ink-muted mb-6">
            {scoreLabel(score / quiz.questions.length)}
          </Text>
          {quiz.questions.map((qq) => {
            const ans = (answers[qq.id] ?? '').trim();
            const correct = isCorrect(qq, ans);
            return (
              <View
                key={qq.id}
                className="bg-bg-card rounded-2xl p-4 mb-3"
              >
                <Text className="text-ink font-medium mb-2">{qq.prompt}</Text>
                <Text
                  className={`text-sm mb-1 ${correct ? 'text-success' : 'text-danger'}`}
                >
                  Your answer: {ans || '—'}
                </Text>
                {!correct && (
                  <Text className="text-ink text-sm mb-2">
                    Correct: {qq.answer}
                  </Text>
                )}
                <Text className="text-ink-muted text-sm">
                  {qq.explanation}
                </Text>
              </View>
            );
          })}
          <View className="mt-4">
            <Button label="Done" onPress={() => router.back()} size="lg" />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="px-4 py-3 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()}>
          <Text className="text-ink-muted">Close</Text>
        </Pressable>
        <Text className="text-ink-muted text-sm">
          {idx + 1} / {quiz.questions.length}
        </Text>
        <View className="w-12" />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 py-6">
        <Text className="text-ink text-xl font-medium leading-7 mb-6">
          {q.prompt}
        </Text>

        {q.type === 'mcq' && q.options ? (
          <View className="gap-3">
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setAnswers({ ...answers, [q.id]: opt })}
                  className={`p-4 rounded-xl border ${
                    selected
                      ? 'border-accent bg-accent/10'
                      : 'border-bg-elevated bg-bg-card'
                  }`}
                >
                  <Text className="text-ink">{opt}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <TextInput
            value={answers[q.id] ?? ''}
            onChangeText={(v) => setAnswers({ ...answers, [q.id]: v })}
            placeholder="Type your answer..."
            placeholderTextColor="#5B6580"
            className="bg-bg-card text-ink rounded-xl p-4 min-h-[100]"
            multiline
          />
        )}
      </ScrollView>

      <View className="px-4 pb-6">
        {!isLast ? (
          <Button
            label="Next"
            onPress={() => setIdx(idx + 1)}
            disabled={!answers[q.id]}
            size="lg"
          />
        ) : (
          <Button
            label="Submit"
            onPress={submit}
            disabled={!answers[q.id]}
            size="lg"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function scoreLabel(pct: number): string {
  if (pct === 1) return 'Perfect — review again tomorrow to lock it in.';
  if (pct >= 0.8) return 'Strong. The misses become tomorrow’s cards.';
  if (pct >= 0.5) return 'Good effort. Review the explanations below.';
  return 'Re-read the source material and try again.';
}

// Models may return MCQ answers as a letter ("A"), the full option text,
// or "A) full text". Accept any of these against the user's selection.
function isCorrect(q: Quiz['questions'][number], userAnswer: string | undefined): boolean {
  if (!userAnswer) return false;
  const a = userAnswer.trim().toLowerCase();
  const expected = q.answer.trim().toLowerCase();
  if (a === expected) return true;
  if (q.type === 'mcq' && q.options) {
    const idx = q.options.findIndex((o) => o.trim().toLowerCase() === a);
    if (idx >= 0) {
      const letter = String.fromCharCode(65 + idx).toLowerCase();
      if (letter === expected) return true;
      // expected might be "B) something" or "B. something"
      if (expected.startsWith(letter + ')') || expected.startsWith(letter + '.')) return true;
    }
  }
  return false;
}

