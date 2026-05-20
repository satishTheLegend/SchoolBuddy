import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Alert, TextInput } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card, CardSubtitle, CardTitle } from '@/components/Card';
import { useAuth } from '@/stores/auth';
import { supabase } from '@/lib/supabase';

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

// TODO(account-export): wire this to a real export job (edge function that
// gathers decks/cards/reviews and emails a download link, or returns a JSON blob).
async function exportMyData(): Promise<void> {
  await new Promise((r) => setTimeout(r, 300));
}

export default function AccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const plan = useMemo(() => {
    const raw = (user?.user_metadata as { plan?: string } | undefined)?.plan;
    return raw ?? 'Free';
  }, [user]);

  const onChangePassword = () => {
    setNewPassword('');
    setPasswordModalOpen(true);
  };

  const submitNewPassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Weak password', 'Use at least 8 characters.');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordModalOpen(false);
      Alert.alert('Password updated', 'Your new password is now active.');
    } catch (e) {
      Alert.alert('Update failed', (e as Error).message);
    } finally {
      setChangingPassword(false);
    }
  };

  const onExport = async () => {
    setExporting(true);
    try {
      await exportMyData();
      Alert.alert(
        'Export queued',
        'When ready, your data will be emailed to you as a downloadable archive.',
      );
    } catch (e) {
      Alert.alert('Export failed', (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const onDelete = () => {
    Alert.alert(
      'Delete account?',
      'This permanently removes your account, decks, cards, and review history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              // TODO(rpc): create the `delete_user_account` Postgres function
              //   (see supabase/migrations/0004_account_deletion.sql) and ensure
              //   it removes auth.users for auth.uid() with SECURITY DEFINER so
              //   ON DELETE CASCADE clears all related public.* rows.
              const { error } = await supabase.rpc('delete_user_account');
              if (error) throw error;
            } catch (e) {
              Alert.alert(
                'Deletion problem',
                `${(e as Error).message}\n\nWe will still sign you out on this device.`,
              );
            } finally {
              await signOut();
              setDeleting(false);
              router.replace('/(auth)/sign-in');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Account',
          headerStyle: { backgroundColor: '#0B0F19' },
          headerTintColor: '#F4F6FB',
          headerTitleStyle: { color: '#F4F6FB' },
        }}
      />

      <ScrollView contentContainerClassName="px-4 py-6 gap-4">
        <Text className="text-ink text-3xl font-bold mb-2">Account</Text>

        <Card>
          <CardTitle>Email</CardTitle>
          <CardSubtitle>{user?.email ?? '—'}</CardSubtitle>
        </Card>

        <Card>
          <CardTitle>Current plan</CardTitle>
          <CardSubtitle>{plan.charAt(0).toUpperCase() + plan.slice(1)}</CardSubtitle>
        </Card>

        <Card>
          <CardTitle>Member since</CardTitle>
          <CardSubtitle>{formatDate(user?.created_at)}</CardSubtitle>
        </Card>

        <View className="gap-3 mt-4">
          <Button
            label="Change password"
            variant="secondary"
            onPress={onChangePassword}
            loading={changingPassword}
          />
          <Button
            label="Export my data"
            variant="secondary"
            onPress={onExport}
            loading={exporting}
          />
          <Button
            label="Delete account"
            variant="danger"
            onPress={onDelete}
            loading={deleting}
          />
        </View>

        {passwordModalOpen ? (
          <Card className="mt-4">
            <CardTitle>Set a new password</CardTitle>
            <CardSubtitle>Minimum 8 characters.</CardSubtitle>
            <View className="mt-3 gap-3">
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoComplete="password-new"
                placeholderTextColor="#5B6580"
                placeholder="New password"
                className="bg-bg-elevated text-ink rounded-xl px-4 py-3 text-base"
              />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button
                    label="Cancel"
                    variant="ghost"
                    onPress={() => setPasswordModalOpen(false)}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Save"
                    onPress={submitNewPassword}
                    loading={changingPassword}
                  />
                </View>
              </View>
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
