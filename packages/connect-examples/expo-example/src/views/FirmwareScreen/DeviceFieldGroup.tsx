import { XStack, YStack } from 'tamagui';
import { DeviceField } from './DeviceField';

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
  return (
    <>
      <DeviceFieldGroupContainer>
        <DeviceField field="device_id" />
        {/* <DeviceField field="serial_no" /> */}
        <DeviceField field="label" />
        <DeviceField field="ble_name" />
        <DeviceField field="ble_ver" />
        {/* <DeviceField field="se_ver" /> */}
        {/* <DeviceField field="onekey_version" /> */}
        {/* <DeviceField field="onekey_serial" /> */}
      </DeviceFieldGroupContainer>

      <DeviceFieldGroupContainer>
        <DeviceField field="onekey_device_type" />
        <DeviceField field="onekey_serial_no" />
        <DeviceField field="onekey_se_type" />
      </DeviceFieldGroupContainer>

      <DeviceFieldGroupContainer>
        <DeviceField field="onekey_board_version" />
        <DeviceField field="onekey_board_hash" />
        <DeviceField field="onekey_board_build_id" />
      </DeviceFieldGroupContainer>

      <DeviceFieldGroupContainer>
        <DeviceField field="onekey_boot_version" />
        <DeviceField field="onekey_boot_hash" />
        <DeviceField field="onekey_boot_build_id" />
        {/* <DeviceField field="bootloader_version" /> */}
        {/* <DeviceField field="bootloader_hash" /> */}
      </DeviceFieldGroupContainer>

      <DeviceFieldGroupContainer>
        <DeviceField field="onekey_firmware_version" />
        <DeviceField field="onekey_firmware_hash" />
        <DeviceField field="onekey_firmware_build_id" />
        {/* <DeviceField field="build_id" /> */}
      </DeviceFieldGroupContainer>

      <DeviceFieldGroupContainer>
        <DeviceField field="onekey_ble_name" />
        <DeviceField field="onekey_ble_version" />
        <DeviceField field="onekey_ble_hash" />
        <DeviceField field="onekey_ble_build_id" />
      </DeviceFieldGroupContainer>
    </>
  );
}

function DeviceSeFieldGroup() {
  return (
    <>
      <DeviceFieldGroupContainer>
        <DeviceField field="onekey_se01_state" />
        <DeviceField field="onekey_se01_version" />
        <DeviceField field="onekey_se01_hash" />
        <DeviceField field="onekey_se01_build_id" />
        <DeviceField field="onekey_se01_boot_version" />
        <DeviceField field="onekey_se01_boot_hash" />
        <DeviceField field="onekey_se01_boot_build_id" />
      </DeviceFieldGroupContainer>

      <DeviceFieldGroupContainer>
        <DeviceField field="onekey_se02_state" />
        <DeviceField field="onekey_se02_version" />
        <DeviceField field="onekey_se02_hash" />
        <DeviceField field="onekey_se02_build_id" />
        <DeviceField field="onekey_se02_boot_version" />
        <DeviceField field="onekey_se02_boot_hash" />
        <DeviceField field="onekey_se02_boot_build_id" />
      </DeviceFieldGroupContainer>

      <DeviceFieldGroupContainer>
        <DeviceField field="onekey_se03_state" />
        <DeviceField field="onekey_se03_version" />
        <DeviceField field="onekey_se03_hash" />
        <DeviceField field="onekey_se03_build_id" />
        <DeviceField field="onekey_se03_boot_version" />
        <DeviceField field="onekey_se03_boot_hash" />
        <DeviceField field="onekey_se03_boot_build_id" />
      </DeviceFieldGroupContainer>

      <DeviceFieldGroupContainer>
        <DeviceField field="onekey_se04_state" />
        <DeviceField field="onekey_se04_version" />
        <DeviceField field="onekey_se04_hash" />
        <DeviceField field="onekey_se04_build_id" />
        <DeviceField field="onekey_se04_boot_version" />
        <DeviceField field="onekey_se04_boot_hash" />
        <DeviceField field="onekey_se04_boot_build_id" />
      </DeviceFieldGroupContainer>
    </>
  );
}

export { DeviceInfoFieldGroup, DeviceSeFieldGroup };
