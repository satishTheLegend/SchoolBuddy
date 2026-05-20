import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { generateKit } from '@/lib/capture';

export default function EditRawText() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rawText, setRawText] = useState('');
  const [originalText, setOriginalText] = useState('');

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('captures')
        .select('raw_text')
        .eq('id', id)
        .single();
      if (!active) return;
      if (error) {
        Alert.alert('Could not load capture', error.message);
        setLoading(false);
        return;
      }
      const text = (data?.raw_text as string | null) ?? '';
      setRawText(text);
      setOriginalText(text);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const dirty = rawText !== originalText;

  const handleCancel = () => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('Discard changes?', 'Your edits will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => router.back(),
      },
    ]);
  };

  const handleSaveAndRegenerate = async () => {
    if (!id) return;
    setSaving(true);
    try {
      // Persist the edited transcript and reset status so the detail screen
      // shows a "generating" state again while the edge function reruns.
      const { error } = await supabase
        .from('captures')
        .update({
          raw_text: rawText,
          status: 'generating',
          error_message: null,
        })
        .eq('id', id);
      if (error) throw error;

      // Fire-and-forget; the detail screen will pick up updates via realtime.
      generateKit(id).catch((e) => console.warn('generateKit', e));

      router.replace(`/capture/${id}`);
    } catch (e) {
      Alert.alert('Save failed', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#7C5CFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="px-4 py-4 flex-row items-center justify-between">
        <Pressable onPress={handleCancel} disabled={saving}>
          <Text className="text-ink-muted text-base">Cancel</Text>
        </Pressable>
        <Text className="text-ink text-base font-semibold">Edit text</Text>
        <View className="w-16" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="px-4 pb-4 gap-3"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-ink-muted text-sm">
            Fix any OCR mistakes below. Saving will regenerate the summary,
            flashcards, and quiz from this text.
          </Text>
          <TextInput
            value={rawText}
            onChangeText={setRawText}
            multiline
            textAlignVertical="top"
            placeholder="Your captured notes will appear here..."
            placeholderTextColor="#6B7280"
            editable={!saving}
            className="bg-bg-card text-ink text-base p-4 rounded-2xl"
            style={{ minHeight: 320 }}
          />
        </ScrollView>

        <View className="px-4 pb-6 pt-2 gap-3">
          <Button
            label={saving ? 'Saving...' : 'Save & regenerate'}
            onPress={handleSaveAndRegenerate}
            size="lg"
            loading={saving}
            disabled={saving || rawText.trim().length === 0}
          />
          <Button
            label="Cancel"
            variant="secondary"
            onPress={handleCancel}
            disabled={saving}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
