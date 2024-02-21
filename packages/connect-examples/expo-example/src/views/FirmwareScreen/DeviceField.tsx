import { memo } from 'react';
import { Stack, Text } from 'tamagui';

interface DeviceFieldProps {
  field: string;
  value: string | null | undefined;
}
function DeviceFieldView({ field, value }: DeviceFieldProps) {
  return (
    <Stack
      width="100%"
      $gtSm={{
        width: '48%',
      }}
      $gtLg={{
        width: '30%',
      }}
    >
      <Text color={value == null ? '$textCritical' : '$text'}>{`${field}: ${value ?? ''}`}</Text>
    </Stack>
  );
}
export const DeviceField = memo(DeviceFieldView);
