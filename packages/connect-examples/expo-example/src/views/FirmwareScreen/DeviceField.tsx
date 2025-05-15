import { memo } from 'react';
import { Stack, Text, XStack } from 'tamagui';
import { useDeviceFieldContext } from './DeviceFieldContext';
import { getReleaseUrl } from '../../utils/deviceUtils';
import { useMedia } from '../../provider/MediaProvider';

interface DeviceFieldProps {
  field: string;
  value?: string | undefined | null;
}

function isNil(value: string | undefined | null): value is string {
  return value == null || value.trim() === '' || value.trim() === 'unknown';
}

function DeviceFieldView({ field, value }: DeviceFieldProps) {
  const { features, onekeyFeatures } = useDeviceFieldContext();
  const media = useMedia();
  const fieldValue =
    (onekeyFeatures as Record<string, string>)?.[field] ??
    (features as Record<string, any>)?.[field] ??
    (
      getReleaseUrl({
        features,
      }) as Record<string, string>
    )?.[field] ??
    value;

  const width = media.gtLg ? '49%' : '100%';
  return (
    <XStack flexWrap="wrap" width={width}>
      <Text
        minWidth={260}
        color={isNil(fieldValue) ? '$textCritical' : '$text'}
        fontSize={18}
        fontWeight="bold"
      >
        {`${field}: `}
      </Text>
      <Stack flex={1} paddingStart={4}>
        {fieldValue?.startsWith('http') ? (
          <Text
            flex={1}
            flexWrap="wrap"
            fontSize={18}
            fontWeight="bold"
            color="$textInfo"
            textDecorationLine="underline"
            cursor="pointer"
            onPress={() => {
              window.open(fieldValue, '_blank');
            }}
          >
            {fieldValue}
          </Text>
        ) : (
          <Text
            flex={1}
            flexWrap="wrap"
            fontSize={18}
            fontWeight="bold"
            color={isNil(fieldValue) ? '$textCritical' : '$text'}
          >{`${fieldValue ?? ''}`}</Text>
        )}
      </Stack>
    </XStack>
  );
}

export const DeviceField = memo(
  DeviceFieldView,
  (prev, next) => prev.field === next.field && prev.value === next.value
);
