import { H5, Stack, XStack } from 'tamagui';
import { useIntl } from 'react-intl';

import { DeviceField } from './DeviceField';
import { useDeviceFieldContext } from './DeviceFieldContext';
import { buildDeviceAdvancedInfo } from './deviceAdvancedInfo';

import type { DeviceAdvancedInfoGroup } from './deviceAdvancedInfo';

interface DeviceFieldGroupContainerProps {
  group: DeviceAdvancedInfoGroup;
}

function DeviceFieldGroupContainer({ group }: DeviceFieldGroupContainerProps) {
  const intl = useIntl();

  return (
    <Stack
      flex={1}
      padding="$2"
      backgroundColor="$bgHover"
      gap="$2"
      borderRadius="$2"
      minWidth={320}
    >
      <H5>{intl.formatMessage({ id: group.titleId })}</H5>
      <XStack flexWrap="wrap" gap="$2">
        {group.fields.map(item => (
          <DeviceField
            key={item.key}
            field={intl.formatMessage({ id: item.labelId })}
            value={item.value}
          />
        ))}
      </XStack>
    </Stack>
  );
}

function DeviceInfoFieldGroup() {
  const { deviceState } = useDeviceFieldContext();
  if (!deviceState) return null;

  return buildDeviceAdvancedInfo(deviceState).deviceGroups.map(group => (
    <DeviceFieldGroupContainer key={group.key} group={group} />
  ));
}

function DeviceSeFieldGroup() {
  const { deviceState } = useDeviceFieldContext();
  if (!deviceState) return null;

  return buildDeviceAdvancedInfo(deviceState).securityElementGroups.map(group => (
    <DeviceFieldGroupContainer key={group.key} group={group} />
  ));
}

export { DeviceInfoFieldGroup, DeviceSeFieldGroup };
