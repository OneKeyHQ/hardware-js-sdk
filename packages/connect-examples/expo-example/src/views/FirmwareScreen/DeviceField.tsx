import { memo } from 'react';
import { Text, XStack } from 'tamagui';

interface DeviceFieldProps {
  field: string;
  value: string | null | undefined;
}

function isNil(value: string | undefined | null): value is string {
  return value == null || value.trim() === '' || value.trim() === 'unknown';
}

function DeviceFieldView({ field, value }: DeviceFieldProps) {
  return (
    <XStack
      width="100%"
      flexWrap="wrap"
      gap="$2"
      $gtSm={{
        width: '48%',
      }}
      $gtLg={{
        width: '30%',
      }}
    >
      <Text color={isNil(value) ? '$textCritical' : '$text'} fontWeight="bold">{`${field}: `}</Text>
      <Text color={isNil(value) ? '$textCritical' : '$text'}>{`${value ?? ''}`}</Text>
    </XStack>
  );
}
export const DeviceField = memo(DeviceFieldView);
