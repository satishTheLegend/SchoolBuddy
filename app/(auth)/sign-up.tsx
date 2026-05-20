import { useState } from 'react';
import { View, Text, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { useAuth } from '@/stores/auth';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const signUp = useAuth((s) => s.signUpWithEmail);

  const submit = async () => {
    if (!email || !password) return;
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await signUp(email.trim(), password);
      Alert.alert(
        'Check your inbox',
        'We sent you a confirmation email. Verify, then sign in.',
      );
    } catch (e) {
      Alert.alert('Sign up failed', (e as Error).message);
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
          <Text className="text-ink text-4xl font-bold mb-2">Create account</Text>
          <Text className="text-ink-muted text-base mb-10">
            10 free captures every month. No card required.
          </Text>

          <View className="gap-4 mb-6">
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor="#5B6580"
              className="bg-bg-elevated text-ink rounded-xl px-4 py-3 text-base"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Password (min 8 chars)"
              placeholderTextColor="#5B6580"
              className="bg-bg-elevated text-ink rounded-xl px-4 py-3 text-base"
            />
          </View>

          <Button label="Create account" onPress={submit} loading={submitting} size="lg" />

          <View className="flex-row justify-center mt-6">
            <Text className="text-ink-muted">Already have one? </Text>
            <Link href="/(auth)/sign-in" className="text-accent font-semibold">
              Sign in
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
