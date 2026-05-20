import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import { ReactNode } from 'react';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}

const variantClass = {
  primary: 'bg-accent active:opacity-80',
  secondary: 'bg-bg-elevated border border-bg-card active:opacity-80',
  ghost: 'bg-transparent active:opacity-60',
  danger: 'bg-danger active:opacity-80',
};

const labelClass = {
  primary: 'text-white',
  secondary: 'text-ink',
  ghost: 'text-accent',
  danger: 'text-white',
};

const sizeClass = {
  sm: 'px-3 py-2 rounded-lg',
  md: 'px-4 py-3 rounded-xl',
  lg: 'px-5 py-4 rounded-2xl',
};

const labelSizeClass = {
  sm: 'text-sm font-medium',
  md: 'text-base font-semibold',
  lg: 'text-lg font-semibold',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`${variantClass[variant]} ${sizeClass[size]} ${
        disabled ? 'opacity-40' : ''
      } flex-row items-center justify-center`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? '#7C5CFF' : '#fff'} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={`${labelClass[variant]} ${labelSizeClass[size]}`}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
