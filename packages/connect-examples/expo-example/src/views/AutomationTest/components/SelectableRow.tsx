import React from 'react';
import { Check as CheckIcon } from '@tamagui/lucide-icons';
import { Checkbox, Text, XStack, YStack } from 'tamagui';

function SelectableRowInner({
  checked,
  disabled,
  title,
  description,
  onToggle,
}: {
  checked: boolean;
  disabled?: boolean;
  title: string;
  description?: string;
  onToggle: () => void;
}) {
  return (
    <XStack
      alignItems="flex-start"
      gap="$3"
      padding="$3"
      borderRadius="$3"
      borderWidth={1}
      borderColor={checked ? '$blue8' : '$gray5'}
      backgroundColor={checked ? '$blue2' : '$gray1'}
      opacity={disabled ? 0.5 : 1}
      onPress={disabled ? undefined : onToggle}
      cursor={disabled ? 'not-allowed' : 'pointer'}
    >
      <Checkbox checked={checked} disabled={disabled} pointerEvents="none">
        <Checkbox.Indicator>
          <CheckIcon />
        </Checkbox.Indicator>
      </Checkbox>
      <YStack flex={1} gap="$1">
        <Text fontSize={13} fontWeight="600">
          {title}
        </Text>
        {description ? (
          <Text fontSize={12} color="$gray10">
            {description}
          </Text>
        ) : null}
      </YStack>
    </XStack>
  );
}

export const SelectableRow = React.memo(SelectableRowInner);
