import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0B0F19' },
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="permissions" />
      <Stack.Screen name="first-capture" />
    </Stack>
  );
}
