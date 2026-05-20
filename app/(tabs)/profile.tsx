import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card, CardSubtitle, CardTitle } from '@/components/Card';
import { useAuth } from '@/stores/auth';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView contentContainerClassName="px-4 py-6 gap-4">
        <Text className="text-ink text-3xl font-bold mb-4">You</Text>

        <Card>
          <CardTitle>Signed in as</CardTitle>
          <CardSubtitle>{user?.email}</CardSubtitle>
        </Card>

        <Card>
          <CardTitle>Free plan</CardTitle>
          <CardSubtitle>10 captures / month • Unlimited review</CardSubtitle>
          <View className="mt-3">
            <Button label="Upgrade to Pro · $4.99/mo" onPress={() => {}} />
          </View>
        </Card>

        <Card>
          <CardTitle>Study habit</CardTitle>
          <CardSubtitle>Daily reminder, 8:00 PM</CardSubtitle>
        </Card>

        <View className="mt-6">
          <Button label="Sign out" variant="secondary" onPress={signOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
