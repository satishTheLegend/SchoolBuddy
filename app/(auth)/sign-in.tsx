import { useState } from 'react';
import { View, Text, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { useAuth } from '@/stores/auth';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const signIn = useAuth((s) => s.signInWithEmail);

  const submit = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      Alert.alert('Sign in failed', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-center">
          <Text className="text-ink text-4xl font-bold mb-2">Welcome back</Text>
          <Text className="text-ink-muted text-base mb-10">
            Snap. Learn. Remember.
          </Text>

          <View className="gap-4 mb-6">
            <View>
              <Text className="text-ink-muted text-sm mb-2">Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholderTextColor="#5B6580"
                placeholder="you@school.edu"
                className="bg-bg-elevated text-ink rounded-xl px-4 py-3 text-base"
              />
            </View>
            <View>
              <Text className="text-ink-muted text-sm mb-2">Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                placeholderTextColor="#5B6580"
                placeholder="••••••••"
                className="bg-bg-elevated text-ink rounded-xl px-4 py-3 text-base"
              />
            </View>
          </View>

          <Button label="Sign in" onPress={submit} loading={submitting} size="lg" />

          <View className="flex-row justify-center mt-6">
            <Text className="text-ink-muted">New here? </Text>
            <Link href="/(auth)/sign-up" className="text-accent font-semibold">
              Create an account
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
