import { View } from 'react-native';
import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  rounded?: boolean;
}

export function Skeleton({
  width = '100%',
  height = 16,
  className = '',
  rounded = false,
}: SkeletonProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => {
      cancelAnimation(opacity);
    };
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as never,
          height: height as never,
        },
        animatedStyle,
      ]}
      className={`bg-bg-elevated ${rounded ? 'rounded-full' : 'rounded-lg'} ${className}`}
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <View className={`bg-bg-card rounded-2xl p-4 ${className}`}>
      <Skeleton width="60%" height={18} className="mb-3" />
      <Skeleton width="100%" height={14} className="mb-2" />
      <Skeleton width="85%" height={14} className="mb-2" />
      <Skeleton width="40%" height={14} />
    </View>
  );
}

export function SkeletonList({
  count = 3,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <View className={`gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
