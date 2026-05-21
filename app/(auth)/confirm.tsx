import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

// Handles the email-confirmation deep link.
// Supabase sends users to `snapstudy://auth/confirm?token_hash=...&type=email`
// after they click the link in their inbox. We verify the OTP and then
// route on into the app.

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenHash = params.token_hash;
    const type = params.type ?? 'email';
    if (!tokenHash) {
      setError('Missing token. Open the link from your confirmation email.');
      return;
    }
    (async () => {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'email',
      });
      if (error) {
        setError(error.message);
        return;
      }
      router.replace('/(tabs)');
    })();
  }, [params.token_hash, params.type, router]);

  return (
    <SafeAreaView className="flex-1 bg-bg items-center justify-center px-8">
      {error ? (
        <View className="items-center gap-4">
          <Text className="text-ink text-2xl font-bold text-center">
            Couldn't confirm
          </Text>
          <Text className="text-ink-muted text-center">{error}</Text>
          <Button
            label="Back to sign in"
            onPress={() => router.replace('/(auth)/sign-in')}
          />
        </View>
      ) : (
        <View className="items-center gap-4">
          <ActivityIndicator color="#7C5CFF" />
          <Text className="text-ink-muted">Confirming your email…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
