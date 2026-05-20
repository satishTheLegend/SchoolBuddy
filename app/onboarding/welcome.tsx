import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';

export default function OnboardingWelcome() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-6 justify-between py-8">
        <View className="flex-row justify-between items-center">
          <Text className="text-ink-muted text-sm">Step 1 of 3</Text>
          <Text className="text-ink-muted text-sm">Welcome</Text>
        </View>

        <View className="items-center">
          <View className="w-24 h-24 rounded-3xl bg-accent items-center justify-center mb-8">
            <Text className="text-white text-5xl font-bold">S</Text>
          </View>
          <Text className="text-ink text-4xl font-bold text-center mb-3">
            Welcome to SnapStudy.
          </Text>
          <Text className="text-accent-soft text-2xl font-semibold text-center mb-6">
            Snap. Learn. Remember.
          </Text>
          <Text className="text-ink-muted text-base text-center leading-6 px-2">
            Turn photos of your notes, textbooks, and slides into flashcards,
            summaries, and quizzes — then remember them with spaced repetition.
          </Text>
        </View>

        <View className="gap-3">
          <Button
            label="Continue"
            size="lg"
            onPress={() => router.push('/onboarding/permissions')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
