import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

// Build the deep-link redirect URL used by Supabase OAuth.
// The `snapstudy` scheme is declared in app.json; this resolves to
// `snapstudy://auth/callback` on a standalone build and to an Expo
// dev URL when running in Expo Go.
function buildRedirectUrl(): string {
  return Linking.createURL('/auth/callback');
}

async function signInWithProvider(provider: 'apple' | 'google'): Promise<void> {
  const redirectTo = buildRedirectUrl();
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: false,
    },
  });
  if (error) throw error;
}

export function signInWithApple(): Promise<void> {
  return signInWithProvider('apple');
}

export function signInWithGoogle(): Promise<void> {
  return signInWithProvider('google');
}
