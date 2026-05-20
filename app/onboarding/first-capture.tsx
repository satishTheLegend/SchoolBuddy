import { useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { markOnboardingComplete } from '@/lib/onboarding';

interface TipRowProps {
  index: number;
  text: string;
}

function TipRow({ index, text }: TipRowProps) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="w-7 h-7 rounded-full bg-accent/20 items-center justify-center mt-0.5">
        <Text className="text-accent-soft text-sm font-bold">{index}</Text>
      </View>
      <Text className="text-ink text-base flex-1 leading-6">{text}</Text>
    </View>
  );
}

export default function OnboardingFirstCapture() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const start = async () => {
    setSubmitting(true);
    try {
      await markOnboardingComplete();
      router.replace('/(tabs)/capture');
    } finally {
      setSubmitting(false);
    }
  };

  const later = async () => {
    setSubmitting(true);
    try {
      await markOnboardingComplete();
      router.replace('/(tabs)');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-6 justify-between py-8">
        <View className="flex-row justify-between items-center">
          <Text className="text-ink-muted text-sm">Step 3 of 3</Text>
          <Text className="text-ink-muted text-sm">First capture</Text>
        </View>

        <View>
          <Text className="text-ink text-3xl font-bold mb-3">
            Capture your first page.
          </Text>
          <Text className="text-ink-muted text-base mb-8 leading-6">
            Point your camera at a notebook page, slide, or textbook. In about
            ten seconds you'll have a summary, flashcards, and a quiz.
          </Text>

          <View className="bg-bg-card rounded-2xl p-5 gap-4">
            <TipRow index={1} text="Lay the page flat in good light." />
            <TipRow
              index={2}
              text="Fill the frame — edges in, no fingers."
            />
            <TipRow
              index={3}
              text="Handwriting is fine. Messy is fine. Just snap it."
            />
          </View>
        </View>

        <View className="gap-3">
          <Button
            label="Snap my first page"
            size="lg"
            onPress={start}
            loading={submitting}
          />
          <Button
            label="I'll do it later"
            variant="ghost"
            onPress={later}
            disabled={submitting}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
