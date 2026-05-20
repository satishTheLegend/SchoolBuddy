import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';
import { ask, type AskMessage } from '@/lib/ask';

export default function AskScreen() {
  const { captureId } = useLocalSearchParams<{ captureId: string }>();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [rawText, setRawText] = useState<string | null>(null);
  const [rawExpanded, setRawExpanded] = useState(false);
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the capture's raw_text for the preview header.
  useEffect(() => {
    if (!captureId) return;
    (async () => {
      const { data } = await supabase
        .from('captures')
        .select('raw_text')
        .eq('id', captureId)
        .single();
      if (data?.raw_text) setRawText(data.raw_text as string);
    })();
  }, [captureId]);

  // Auto-scroll to the latest message whenever the conversation grows.
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(t);
  }, [messages.length, sending]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !captureId) return;
    setError(null);

    const next: AskMessage[] = [
      ...messages,
      { role: 'user', content: trimmed },
    ];
    setMessages(next);
    setInput('');
    setSending(true);

    try {
      const reply = await ask(captureId, next);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError((e as Error).message ?? 'Something went wrong.');
      // Roll the user message back so they can retry the same text.
      setMessages(messages);
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <View className="px-4 py-4 flex-row items-center justify-between border-b border-bg-elevated">
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text className="text-ink-muted text-base">Close</Text>
        </Pressable>
        <Text className="text-ink font-semibold text-base">Ask anything</Text>
        <View className="w-12" />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="px-4 py-4 gap-3"
          keyboardShouldPersistTaps="handled"
        >
          {/* Raw text preview — collapsed by default. */}
          {rawText ? (
            <Pressable
              onPress={() => setRawExpanded((v) => !v)}
              className="bg-bg-card rounded-2xl p-4 active:opacity-80"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-ink-muted text-xs uppercase tracking-wide">
                  Source notes
                </Text>
                <Text className="text-accent text-xs font-semibold">
                  {rawExpanded ? 'Hide' : 'Show'}
                </Text>
              </View>
              <Text
                className="text-ink text-sm mt-2 leading-5"
                numberOfLines={rawExpanded ? undefined : 2}
              >
                {rawText}
              </Text>
            </Pressable>
          ) : null}

          {messages.length === 0 && !sending && (
            <View className="mt-2">
              <Text className="text-ink-muted text-sm leading-5">
                Ask follow-up questions about your notes. Try
                {' "explain the main idea in plain English"'} or
                {' "give me an example".'}
              </Text>
            </View>
          )}

          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}

          {sending && (
            <View className="self-start bg-bg-card rounded-2xl px-4 py-3 max-w-[80%] flex-row items-center">
              <ActivityIndicator color="#7C5CFF" size="small" />
              <Text className="text-ink-muted ml-2 text-sm">Thinking...</Text>
            </View>
          )}

          {error && (
            <View className="bg-danger/10 border border-danger rounded-xl px-3 py-2">
              <Text className="text-danger text-sm">{error}</Text>
            </View>
          )}
        </ScrollView>

        <View className="px-4 pt-2 pb-4 border-t border-bg-elevated bg-bg">
          <View className="flex-row items-end gap-2">
            <View className="flex-1 bg-bg-card rounded-2xl px-4 py-3">
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask about your notes..."
                placeholderTextColor="#5B6580"
                className="text-ink text-base max-h-32"
                multiline
                editable={!sending}
                onSubmitEditing={send}
                blurOnSubmit={false}
              />
            </View>
            <Pressable
              onPress={send}
              disabled={sending || !input.trim()}
              className={`rounded-2xl px-4 py-3 ${
                sending || !input.trim()
                  ? 'bg-bg-elevated opacity-60'
                  : 'bg-accent active:opacity-80'
              }`}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">Send</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message }: { message: AskMessage }) {
  const isUser = message.role === 'user';
  return (
    <View
      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
        isUser ? 'self-end bg-accent' : 'self-start bg-bg-card'
      }`}
    >
      <Text
        className={`${isUser ? 'text-white' : 'text-ink'} text-base leading-6`}
      >
        {message.content}
      </Text>
    </View>
  );
}
