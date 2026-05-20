import { Text } from 'react-native';
import { useEffect } from 'react';
import { create } from 'zustand';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastStore {
  current: ToastItem | null;
  show: (message: string, type?: ToastType) => void;
  clear: () => void;
}

const useToastStore = create<ToastStore>((set) => ({
  current: null,
  show: (message, type = 'info') =>
    set({ current: { id: Date.now(), message, type } }),
  clear: () => set({ current: null }),
}));

export function useToast() {
  const show = useToastStore((s) => s.show);
  return { show };
}

const typeClass: Record<ToastType, string> = {
  success: 'bg-success',
  error: 'bg-danger',
  info: 'bg-bg-elevated border border-bg-card',
};

const typeTextClass: Record<ToastType, string> = {
  success: 'text-white',
  error: 'text-white',
  info: 'text-ink',
};

export function ToastRoot() {
  const current = useToastStore((s) => s.current);
  const clear = useToastStore((s) => s.clear);

  const translateY = useSharedValue(80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!current) return;
    translateY.value = withSequence(
      withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) }),
      withDelay(
        2500,
        withTiming(
          80,
          { duration: 250, easing: Easing.in(Easing.cubic) },
          (finished) => {
            if (finished) runOnJS(clear)();
          }
        )
      )
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(2500, withTiming(0, { duration: 250 }))
    );
  }, [current, translateY, opacity, clear]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!current) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 32,
        },
        animatedStyle,
      ]}
      className={`${typeClass[current.type]} rounded-2xl px-4 py-3`}
    >
      <Text
        className={`${typeTextClass[current.type]} text-base font-medium text-center`}
      >
        {current.message}
      </Text>
    </Animated.View>
  );
}
