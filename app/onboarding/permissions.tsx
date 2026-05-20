import { useState } from 'react';
import { View, Text, Alert, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera } from 'expo-camera';
import * as Notifications from 'expo-notifications';

import { Button } from '@/components/Button';

interface PermissionRowProps {
  title: string;
  body: string;
  status: 'pending' | 'granted' | 'denied';
}

function PermissionRow({ title, body, status }: PermissionRowProps) {
  const statusLabel =
    status === 'granted' ? 'Allowed' : status === 'denied' ? 'Denied' : 'Needed';
  const statusClass =
    status === 'granted'
      ? 'text-success'
      : status === 'denied'
        ? 'text-danger'
        : 'text-ink-muted';

  return (
    <View className="bg-bg-card rounded-2xl p-5">
      <View className="flex-row justify-between items-start mb-1">
        <Text className="text-ink text-lg font-semibold flex-1 pr-3">
          {title}
        </Text>
        <Text className={`${statusClass} text-sm font-semibold`}>
          {statusLabel}
        </Text>
      </View>
      <Text className="text-ink-muted text-sm leading-5">{body}</Text>
    </View>
  );
}

export default function OnboardingPermissions() {
  const router = useRouter();
  const [cameraStatus, setCameraStatus] = useState<
    'pending' | 'granted' | 'denied'
  >('pending');
  const [notifStatus, setNotifStatus] = useState<
    'pending' | 'granted' | 'denied'
  >('pending');
  const [submitting, setSubmitting] = useState(false);

  const requestAll = async () => {
    setSubmitting(true);
    try {
      // Camera permission
      const cam = await Camera.requestCameraPermissionsAsync();
      const camGranted = cam.status === 'granted';
      setCameraStatus(camGranted ? 'granted' : 'denied');

      // Notification permission
      const notif = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      const notifGranted =
        notif.status === 'granted' ||
        notif.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      setNotifStatus(notifGranted ? 'granted' : 'denied');

      if (!camGranted) {
        Alert.alert(
          'Camera needed',
          'SnapStudy needs camera access to turn pages into study kits. You can enable it in Settings.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      router.push('/onboarding/first-capture');
    } catch (e) {
      Alert.alert('Permission request failed', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const skip = () => router.push('/onboarding/first-capture');

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-6 justify-between py-8">
        <View className="flex-row justify-between items-center">
          <Text className="text-ink-muted text-sm">Step 2 of 3</Text>
          <Text className="text-ink-muted text-sm">Permissions</Text>
        </View>

        <View>
          <Text className="text-ink text-3xl font-bold mb-3">
            A couple of quick asks.
          </Text>
          <Text className="text-ink-muted text-base mb-8 leading-6">
            SnapStudy works best when it can see your notes and gently nudge you
            to review.
          </Text>

          <View className="gap-3">
            <PermissionRow
              title="Camera"
              body="So you can snap a page and get flashcards in seconds. Photos stay private to your account."
              status={cameraStatus}
            />
            <PermissionRow
              title="Notifications"
              body="Just one daily nudge when cards are due. No spam, no streak guilt — turn it off any time."
              status={notifStatus}
            />
          </View>
        </View>

        <View className="gap-3">
          <Button
            label={Platform.OS === 'ios' ? 'Allow access' : 'Grant permissions'}
            size="lg"
            onPress={requestAll}
            loading={submitting}
          />
          <Button label="Skip for now" variant="ghost" onPress={skip} />
        </View>
      </View>
    </SafeAreaView>
  );
}
