import { View, Text } from 'react-native';

interface StreakBadgeProps {
  count: number;
  frozen?: boolean;
}

export function StreakBadge({ count, frozen = false }: StreakBadgeProps) {
  const bg = frozen ? 'bg-bg-elevated' : 'bg-bg-card';
  const textColor = frozen ? 'text-ink-muted' : 'text-ink';
  const icon = frozen ? '❄' : '🔥';

  return (
    <View
      className={`${bg} flex-row items-center gap-1 px-3 py-1.5 rounded-full`}
    >
      <Text className="text-base">{icon}</Text>
      <Text className={`${textColor} text-sm font-semibold`}>{count}</Text>
    </View>
  );
}
