import { View, Text, Pressable } from 'react-native';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
}

export function Card({ children, onPress, className = '' }: CardProps) {
  const inner = (
    <View className={`bg-bg-card rounded-2xl p-4 ${className}`}>{children}</View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:opacity-70">
        {inner}
      </Pressable>
    );
  }
  return inner;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <Text className="text-ink text-lg font-semibold mb-1">{children}</Text>
  );
}

export function CardSubtitle({ children }: { children: ReactNode }) {
  return <Text className="text-ink-muted text-sm">{children}</Text>;
}
