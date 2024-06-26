import { XStack } from 'tamagui';
import { DeviceField } from './DeviceField';
import { deviceInfoKeys, deviceSEInfoKeys } from './ExportDeviceInfo';

interface DeviceFieldGroupContainerProps {
  children: React.ReactNode;
}

function DeviceFieldGroupContainer({ children }: DeviceFieldGroupContainerProps) {
  return (
    <XStack
      flex={1}
      padding="$2"
      backgroundColor="$bgHover"
      gap="$2"
      borderRadius="$2"
      flexWrap="wrap"
    >
      {children}
    </XStack>
  );
}

function DeviceInfoFieldGroup() {
  return deviceInfoKeys.map((keys, index) => (
    <DeviceFieldGroupContainer key={index}>
      {keys.map(key => (
        <DeviceField key={key} field={key} />
      ))}
    </DeviceFieldGroupContainer>
  ));
}

function DeviceSeFieldGroup() {
  return deviceSEInfoKeys.map((keys, index) => (
    <DeviceFieldGroupContainer key={index}>
      {keys.map(key => (
        <DeviceField key={key} field={key} />
      ))}
    </DeviceFieldGroupContainer>
  ));
}

export { DeviceInfoFieldGroup, DeviceSeFieldGroup };
