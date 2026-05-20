import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import {
  billing,
  FREE_FEATURES,
  Offering,
  BillingPeriod,
  PaidTier,
} from '@/lib/billing';

function CheckRow({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <View className="flex-row items-start gap-2 py-1">
      <Text className={muted ? 'text-ink-dim' : 'text-accent'}>{'✓'}</Text>
      <Text
        className={`flex-1 text-sm ${muted ? 'text-ink-dim' : 'text-ink-muted'}`}
      >
        {label}
      </Text>
    </View>
  );
}

function SegmentedControl({
  value,
  onChange,
}: {
  value: BillingPeriod;
  onChange: (v: BillingPeriod) => void;
}) {
  const items: { id: BillingPeriod; label: string }[] = [
    { id: 'monthly', label: 'Monthly' },
    { id: 'annual', label: 'Annual' },
  ];
  return (
    <View className="flex-row bg-bg-elevated rounded-xl p-1 mb-4">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <Pressable
            key={item.id}
            onPress={() => onChange(item.id)}
            className={`flex-1 py-2 rounded-lg ${
              active ? 'bg-accent' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                active ? 'text-white' : 'text-ink-muted'
              }`}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TierBadge({ text }: { text: string }) {
  return (
    <View className="self-start bg-accent/20 rounded-full px-2 py-1 mb-2">
      <Text className="text-accent text-xs font-semibold">{text}</Text>
    </View>
  );
}

export default function Paywall() {
  const router = useRouter();
  const [offerings, setOfferings] = useState<Offering[] | null>(null);
  const [proPeriod, setProPeriod] = useState<BillingPeriod>('monthly');
  const [purchasing, setPurchasing] = useState<PaidTier | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let cancelled = false;
    billing
      .getOfferings()
      .then((data) => {
        if (!cancelled) setOfferings(data);
      })
      .catch((e) => Alert.alert('Could not load plans', (e as Error).message));
    return () => {
      cancelled = true;
    };
  }, []);

  const proOffering = useMemo(
    () => offerings?.find((o) => o.tier === 'pro' && o.period === proPeriod),
    [offerings, proPeriod]
  );
  const studentOffering = useMemo(
    () => offerings?.find((o) => o.tier === 'student'),
    [offerings]
  );

  const handlePurchase = async (offering?: Offering) => {
    if (!offering) return;
    setPurchasing(offering.tier);
    try {
      const { tier } = await billing.purchase(offering.productId);
      Alert.alert('Welcome to ' + tier.toUpperCase(), 'Your plan is active.');
      router.back();
    } catch (e) {
      Alert.alert('Purchase failed', (e as Error).message);
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await billing.restorePurchases();
      const tier = await billing.getActiveTier();
      Alert.alert(
        'Restore complete',
        tier === 'free'
          ? 'No previous purchases found.'
          : `Restored your ${tier.toUpperCase()} plan.`
      );
    } catch (e) {
      Alert.alert('Restore failed', (e as Error).message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      {/* Close button */}
      <View className="flex-row justify-end px-4 pt-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 rounded-full bg-bg-elevated items-center justify-center active:opacity-70"
        >
          <Text className="text-ink text-xl">{'✕'}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-ink text-4xl font-bold mb-2 mt-2">
          Unlimited study, ad-free
        </Text>
        <Text className="text-ink-muted text-base mb-8">
          Snap. Learn. Remember — without limits.
        </Text>

        {offerings == null ? (
          <View className="py-20 items-center">
            <ActivityIndicator color="#7C5CFF" size="large" />
          </View>
        ) : (
          <View className="gap-4">
            {/* Free tier */}
            <Card>
              <View className="flex-row items-baseline justify-between mb-2">
                <Text className="text-ink text-xl font-semibold">Free</Text>
                <Text className="text-ink-muted text-sm">$0</Text>
              </View>
              <Text className="text-ink-muted text-sm mb-3">
                Try SnapStudy with the essentials.
              </Text>
              {FREE_FEATURES.map((f) => (
                <CheckRow key={f} label={f} muted />
              ))}
            </Card>

            {/* Pro tier */}
            <Card className="border border-accent">
              <TierBadge text="MOST POPULAR" />
              <View className="flex-row items-baseline justify-between mb-1">
                <Text className="text-ink text-xl font-semibold">Pro</Text>
                {proOffering?.badge && proPeriod === 'annual' ? (
                  <Text className="text-success text-xs font-semibold">
                    {proOffering.badge}
                  </Text>
                ) : null}
              </View>
              <Text className="text-ink text-3xl font-bold mb-1">
                {proOffering?.priceString ?? '—'}
              </Text>
              <Text className="text-ink-muted text-sm mb-4">
                {proPeriod === 'monthly' ? 'per month' : 'per year'}
              </Text>

              <SegmentedControl value={proPeriod} onChange={setProPeriod} />

              <View className="mb-4">
                {(proOffering?.features ?? []).map((f) => (
                  <CheckRow key={f} label={f} />
                ))}
              </View>

              <Button
                label={`Get Pro — ${proOffering?.displayLabel ?? ''}`}
                onPress={() => handlePurchase(proOffering)}
                loading={purchasing === 'pro'}
                disabled={!proOffering || purchasing !== null}
                size="lg"
              />
            </Card>

            {/* Student tier */}
            <Card>
              <TierBadge text="STUDENTS" />
              <View className="flex-row items-baseline justify-between mb-1">
                <Text className="text-ink text-xl font-semibold">Student</Text>
                {studentOffering?.badge ? (
                  <Text className="text-ink-muted text-xs">
                    {studentOffering.badge}
                  </Text>
                ) : null}
              </View>
              <Text className="text-ink text-3xl font-bold mb-1">
                {studentOffering?.priceString ?? '—'}
              </Text>
              <Text className="text-ink-muted text-sm mb-4">per year</Text>

              <View className="mb-4">
                {(studentOffering?.features ?? []).map((f) => (
                  <CheckRow key={f} label={f} />
                ))}
              </View>

              <Button
                label={`Get Student — ${studentOffering?.displayLabel ?? ''}`}
                onPress={() => handlePurchase(studentOffering)}
                loading={purchasing === 'student'}
                disabled={!studentOffering || purchasing !== null}
                variant="secondary"
                size="lg"
              />
            </Card>
          </View>
        )}

        {/* Restore + fine print */}
        <View className="items-center mt-8">
          <Pressable
            onPress={handleRestore}
            disabled={restoring}
            hitSlop={8}
            className="py-2 active:opacity-60"
          >
            {restoring ? (
              <ActivityIndicator color="#7C5CFF" />
            ) : (
              <Text className="text-accent font-semibold">
                Restore purchases
              </Text>
            )}
          </Pressable>
          <Text className="text-ink-dim text-xs text-center mt-4 px-4">
            Subscriptions auto-renew until cancelled. Manage anytime in your
            store account. Cancel at least 24h before renewal to avoid being
            charged.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
