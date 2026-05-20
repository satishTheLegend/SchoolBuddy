import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';

import { useAuth } from '@/stores/auth';
import { initDb } from '@/lib/db/client';
import { hasCompletedOnboarding } from '@/lib/onboarding';
import { ToastRoot } from '@/components/Toast';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading, init } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    init();
    initDb().catch((e) => console.warn('SQLite init failed', e));
    hasCompletedOnboarding().then(setOnboarded).catch(() => setOnboarded(true));
  }, [init]);

  useEffect(() => {
    if (loading || onboarded === null) return;
    const group = segments[0];
    const inAuth = group === '(auth)';
    const inOnboarding = group === 'onboarding';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/sign-in');
      return;
    }
    if (!onboarded) {
      if (!inOnboarding) router.replace('/onboarding/welcome');
      return;
    }
    if (inAuth || inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [session, loading, onboarded, segments, router]);

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#7C5CFF" size="large" />
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGate>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0F19' } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen
                name="capture/[id]"
                options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
              />
              <Stack.Screen
                name="review/[deckId]"
                options={{ presentation: 'fullScreenModal' }}
              />
              <Stack.Screen
                name="quiz/[id]"
                options={{ presentation: 'fullScreenModal' }}
              />
              <Stack.Screen name="deck/[id]" />
              <Stack.Screen name="ask/[captureId]" />
              <Stack.Screen name="card/[id]" />
              <Stack.Screen name="search" />
              <Stack.Screen
                name="paywall"
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen name="account/index" />
              <Stack.Screen name="settings/notifications" />
              <Stack.Screen name="capture/multi" />
              <Stack.Screen name="capture/[id]_edit" />
            </Stack>
            <ToastRoot />
          </AuthGate>
          <StatusBar style="light" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
