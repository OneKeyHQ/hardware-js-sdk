import { memo } from 'react';
import { Stack, Text, XStack } from 'tamagui';
import { Text as RNText } from 'react-native';
import { useDeviceFieldContext } from './DeviceFieldContext';

interface DeviceFieldProps {
  field: string;
  value?: string | undefined | null;
}

function isNil(value: string | undefined | null): value is string {
  return value == null || value.trim() === '' || value.trim() === 'unknown';
}

function DeviceFieldView({ field, value }: DeviceFieldProps) {
  const { features, onekeyFeatures } = useDeviceFieldContext();

  // @ts-expect-error
  const fieldValue = onekeyFeatures?.[field] ?? features?.[field] ?? value;

  return (
    <XStack
      flexWrap="wrap"
      width="100%"
      $gtSm={{
        width: '49%',
      }}
      $gtLg={{
        width: '32%',
      }}
    >
      <Text color={isNil(fieldValue) ? '$textCritical' : '$text'} fontWeight="bold">
        {`${field}: `}
      </Text>
      <Stack flex={1}>
        <Text flex={1} flexWrap="wrap" color={isNil(fieldValue) ? '$textCritical' : '$text'}>{`${
          fieldValue ?? ''
        }`}</Text>
      </Stack>
    </XStack>
  );
}

export const DeviceField = memo(
  DeviceFieldView,
  (prev, next) => prev.field === next.field && prev.value === next.value
);
