import { View, Text } from 'react-native';
import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Text className="text-ink text-xl font-semibold text-center mb-2">
        {title}
      </Text>
      {body && (
        <Text className="text-ink-muted text-base text-center mb-6">
          {body}
        </Text>
      )}
      {action}
    </View>
  );
}
