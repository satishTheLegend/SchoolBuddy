import { View, Text } from 'react-native';
import { Button } from './Button';

interface ErrorViewProps {
  title?: string;
  message: string;
  retry?: () => void;
}

export function ErrorView({
  title = 'Something went wrong',
  message,
  retry,
}: ErrorViewProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Text className="text-ink text-xl font-semibold text-center mb-2">
        {title}
      </Text>
      <Text className="text-ink-muted text-base text-center mb-6">
        {message}
      </Text>
      {retry && <Button label="Try again" onPress={retry} variant="primary" />}
    </View>
  );
}
