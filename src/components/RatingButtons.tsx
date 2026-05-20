import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Rating, RATING } from '@/lib/fsrs';
import { formatDueDelta } from '@/lib/utils';

interface RatingButtonsProps {
  onRate: (rating: Rating) => void;
  previewDays: Record<Rating, number>;
}

const labels: Record<Rating, { label: string; color: string }> = {
  [RATING.Again]: { label: 'Again', color: 'bg-danger' },
  [RATING.Hard]: { label: 'Hard', color: 'bg-warning' },
  [RATING.Good]: { label: 'Good', color: 'bg-success' },
  [RATING.Easy]: { label: 'Easy', color: 'bg-accent' },
};

export function RatingButtons({ onRate, previewDays }: RatingButtonsProps) {
  const handle = (r: Rating) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onRate(r);
  };

  return (
    <View className="flex-row gap-2 px-4 pb-4">
      {([RATING.Again, RATING.Hard, RATING.Good, RATING.Easy] as Rating[]).map(
        (r) => (
          <Pressable
            key={r}
            onPress={() => handle(r)}
            className={`flex-1 ${labels[r].color} rounded-xl p-4 active:opacity-80`}
          >
            <Text className="text-white font-semibold text-center">
              {labels[r].label}
            </Text>
            <Text className="text-white/80 text-xs text-center mt-1">
              {formatDueDelta(previewDays[r])}
            </Text>
          </Pressable>
        ),
      )}
    </View>
  );
}
