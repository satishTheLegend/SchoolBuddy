import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View className="items-center">
      <Text className={focused ? 'text-accent text-xs font-semibold' : 'text-ink-muted text-xs'}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0B0F19',
          borderTopColor: '#1A2236',
          height: 64,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Today" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="decks"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Decks" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Snap" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="You" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
