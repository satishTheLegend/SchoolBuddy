import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card, CardSubtitle, CardTitle } from '@/components/Card';
import {
  DailyReviewSettings,
  getDailyReviewSettings,
  setDailyReviewSettings,
} from '@/lib/notifications';

function clampHour(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return ((Math.floor(n) % 24) + 24) % 24;
}

function clampMinute(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return ((Math.floor(n) % 60) + 60) % 60;
}

function format12h(hour: number, minute: number): string {
  const h12 = ((hour + 11) % 12) + 1;
  const mm = String(minute).padStart(2, '0');
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h12}:${mm} ${ampm}`;
}

interface StepperProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  step?: number;
  wrap: (n: number) => number;
  disabled?: boolean;
}

function Stepper({ label, value, onChange, step = 1, wrap, disabled }: StepperProps) {
  const display = String(value).padStart(2, '0');
  return (
    <View className="flex-1 items-center">
      <Text className="text-ink-muted text-xs uppercase tracking-wider mb-2">
        {label}
      </Text>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => onChange(wrap(value - step))}
          disabled={disabled}
          className={`w-10 h-10 rounded-full bg-bg-elevated items-center justify-center ${
            disabled ? 'opacity-40' : 'active:opacity-70'
          }`}
        >
          <Text className="text-ink text-xl font-bold">-</Text>
        </Pressable>
        <Text className="text-ink text-4xl font-bold w-16 text-center tabular-nums">
          {display}
        </Text>
        <Pressable
          onPress={() => onChange(wrap(value + step))}
          disabled={disabled}
          className={`w-10 h-10 rounded-full bg-bg-elevated items-center justify-center ${
            disabled ? 'opacity-40' : 'active:opacity-70'
          }`}
        >
          <Text className="text-ink text-xl font-bold">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function NotificationsSettingsScreen() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<DailyReviewSettings>({
    enabled: false,
    hour: 20,
    minute: 0,
  });

  useEffect(() => {
    let mounted = true;
    getDailyReviewSettings()
      .then((s) => {
        if (mounted) {
          setSettings(s);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (mounted) setLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const persist = async (next: DailyReviewSettings) => {
    setSettings(next);
    setSaving(true);
    try {
      await setDailyReviewSettings(next);
      // setDailyReviewSettings may downgrade `enabled` to false if the OS
      // denied permission — re-read so the UI reflects reality.
      const fresh = await getDailyReviewSettings();
      setSettings(fresh);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color="#7C5CFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <Stack.Screen options={{ title: 'Notifications', headerShown: false }} />
      <ScrollView contentContainerClassName="px-4 py-6 gap-4">
        <View className="flex-row items-center justify-between mb-2">
          <Pressable onPress={() => router.back()} className="active:opacity-60">
            <Text className="text-accent text-base">Back</Text>
          </Pressable>
          {saving ? <ActivityIndicator color="#7C5CFF" /> : <View />}
        </View>

        <Text className="text-ink text-3xl font-bold mb-2">Notifications</Text>
        <Text className="text-ink-muted text-base mb-4">
          A gentle nudge once a day. No streak-shame screens.
        </Text>

        <Card>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <CardTitle>Daily review reminder</CardTitle>
              <CardSubtitle>
                Local notification at {format12h(settings.hour, settings.minute)}
              </CardSubtitle>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(enabled) => persist({ ...settings, enabled })}
              disabled={saving}
              trackColor={{ false: '#2A2F3D', true: '#7C5CFF' }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        <Card>
          <CardTitle>Time</CardTitle>
          <CardSubtitle>
            {settings.enabled
              ? 'Tap +/- to adjust. Changes apply immediately.'
              : 'Enable the reminder above to schedule a time.'}
          </CardSubtitle>
          <View className="flex-row items-center justify-around mt-5 mb-2">
            <Stepper
              label="Hour"
              value={settings.hour}
              wrap={clampHour}
              disabled={saving}
              onChange={(hour) => persist({ ...settings, hour })}
            />
            <Text className="text-ink text-4xl font-bold pb-1">:</Text>
            <Stepper
              label="Minute"
              value={settings.minute}
              step={5}
              wrap={clampMinute}
              disabled={saving}
              onChange={(minute) => persist({ ...settings, minute })}
            />
          </View>
          <Text className="text-ink-muted text-center text-sm mt-2">
            {format12h(settings.hour, settings.minute)}
          </Text>
        </Card>

        <View className="mt-2">
          <Button label="Done" variant="secondary" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
