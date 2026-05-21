import { Pressable, Text, View } from 'react-native';

interface TagChipProps {
  name: string;
  color?: string;
  onPress?: () => void;
  onRemove?: () => void;
  selected?: boolean;
}

export function TagChip({
  name,
  color = '#7C5CFF',
  onPress,
  onRemove,
  selected,
}: TagChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-full px-3 py-1 mr-2"
      style={{
        backgroundColor: selected ? color : `${color}22`,
        borderWidth: 1,
        borderColor: color,
      }}
    >
      <Text
        className="text-xs font-semibold"
        style={{ color: selected ? '#fff' : color }}
      >
        {name}
      </Text>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={8} className="ml-2">
          <Text style={{ color: selected ? '#fff' : color }} className="text-xs">
            ×
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

export function TagList({
  tags,
  selectedIds,
  onToggle,
}: {
  tags: { id: string; name: string; color: string }[];
  selectedIds?: string[];
  onToggle?: (id: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-y-2">
      {tags.map((t) => (
        <TagChip
          key={t.id}
          name={t.name}
          color={t.color}
          selected={selectedIds?.includes(t.id)}
          onPress={onToggle ? () => onToggle(t.id) : undefined}
        />
      ))}
    </View>
  );
}
