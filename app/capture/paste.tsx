import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { useAuth } from '@/stores/auth';
import { createTextCapture, generateFromText } from '@/lib/paste-capture';

export default function PasteCaptureScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const captureId = await createTextCapture(user.id, text);
      generateFromText(captureId).catch((e) => console.warn(e));
      router.replace(`/capture/${captureId}`);
    } catch (e) {
      Alert.alert('Could not create capture', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="px-4 py-4 flex-row items-center justify-between">
          <Pressable onPress={() => router.back()}>
            <Text className="text-ink-muted">Cancel</Text>
          </Pressable>
          <Text className="text-ink font-semibold">Paste notes</Text>
          <Pressable onPress={submit} disabled={busy || text.trim().length < 20}>
            <Text
              className={
                busy || text.trim().length < 20 ? 'text-ink-dim' : 'text-accent font-semibold'
              }
            >
              Generate
            </Text>
          </Pressable>
        </View>

        <View className="flex-1 px-4">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Paste or type your notes here. SnapStudy will turn them into flashcards, a summary, and a quiz."
            placeholderTextColor="#5B6580"
            className="bg-bg-card text-ink rounded-2xl p-4 flex-1 text-base"
            multiline
            textAlignVertical="top"
            autoFocus
          />
          <Text className="text-ink-dim text-xs mt-2">
            {text.length} characters · {text.trim().split(/\s+/).filter(Boolean).length} words
          </Text>
          <View className="mt-4">
            <Button
              label="Generate study kit"
              onPress={submit}
              loading={busy}
              disabled={text.trim().length < 20}
              size="lg"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
