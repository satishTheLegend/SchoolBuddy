import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (params.error) {
          throw new Error(params.error_description ?? params.error);
        }
        const code = typeof params.code === 'string' ? params.code : undefined;
        if (!code) {
          throw new Error('Missing OAuth code in callback URL');
        }
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        if (!cancelled) {
          router.replace('/(tabs)');
        }
      } catch (e) {
        console.warn('[auth/callback] exchange failed', e);
        if (!cancelled) {
          router.replace('/(auth)/sign-in');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.code, params.error, params.error_description, router]);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 items-center justify-center px-6 gap-4">
        <ActivityIndicator color="#7C5CFF" size="large" />
        <Text className="text-ink text-base font-medium">Finishing sign in…</Text>
        <Text className="text-ink-muted text-sm text-center">
          Hold tight while we securely complete authentication.
        </Text>
      </View>
    </SafeAreaView>
  );
}
