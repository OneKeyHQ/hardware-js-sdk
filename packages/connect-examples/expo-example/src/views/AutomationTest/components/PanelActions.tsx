import { Button, XStack } from 'tamagui';

export function PanelActions({
  disabled,
  onSelectAll,
  onClear,
}: {
  disabled?: boolean;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  return (
    <XStack gap="$2">
      <Button size="$2" onPress={onSelectAll} disabled={disabled}>
        全选
      </Button>
      <Button size="$2" theme="gray" onPress={onClear} disabled={disabled}>
        清空
      </Button>
    </XStack>
  );
}
