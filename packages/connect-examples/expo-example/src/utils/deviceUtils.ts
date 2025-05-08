import {
  getHardwareInfoFromFeatures,
  getFirmwareInfoFromFeatures,
  getSeInfoFromFeatures,
  EDeviceType,
} from '@onekeyfe/hd-shared';
import type { Features } from '@onekeyfe/hd-transport';

export const getReleaseUrl = ({ features }: { features?: Features }) => {
  if (!features)
    return {
      onekey_boot_url: '',
      onekey_firmware_url: '',
      onekey_ble_url: '',
    };
  const { firmwareVersion, bootloaderVersion, bleVersion } = getFirmwareInfoFromFeatures(features);
  const { deviceType } = getHardwareInfoFromFeatures(features);
  // classic 类型（包括classci 1s, mini, classic），不需要更新bootloader
  switch (deviceType) {
    case EDeviceType.Classic1s:
    case EDeviceType.ClassicPure:
      return {
        onekey_boot_url: '',
        onekey_firmware_url: firmwareVersion
          ? `https://github.com/OneKeyHQ/firmware-classic1s/releases/tag/v${firmwareVersion}`
          : '',
        onekey_ble_url: bleVersion
          ? `https://github.com/OneKeyHQ/bluetooth-firmware-classic/releases/tag/v${bleVersion}`
          : '',
      };
    case EDeviceType.Pro:
      return {
        onekey_boot_url: bootloaderVersion
          ? `https://github.com/OneKeyHQ/firmware-pro/releases/tag/bootloader-v${bootloaderVersion}`
          : '',
        onekey_firmware_url: firmwareVersion
          ? `https://github.com/OneKeyHQ/firmware-pro/releases/tag/v${firmwareVersion}`
          : '',
        onekey_ble_url: bleVersion
          ? `https://github.com/OneKeyHQ/bluetooth-firmware-pro/releases/tag/v${bleVersion}`
          : '',
      };
    default:
      return {
        onekey_boot_url: ``,
        onekey_firmware_url: ``,
        onekey_ble_url: ``,
      };
  }
};

export function getDeviceBasicInfo(features: Features | undefined) {
  if (!features)
    return {
      deviceType: '',
      serialNumber: '',
      bleVersion: '',
      bootloaderVersion: '',
      boardloaderVersion: '',
      firmwareVersion: '',
      boardloaderBuildId: '',
      bootloaderBuildId: '',
      firmwareBuildId: '',
      bleBuildId: '',
    };
  const {
    bootloaderVersion,
    boardloaderVersion,
    firmwareVersion,
    firmwareBuildId,
    bootloaderBuildId,
    boardloaderBuildId,
    bleVersion,
    bleBuildId,
  } = getFirmwareInfoFromFeatures(features);
  const { deviceType, serialNumber } = getHardwareInfoFromFeatures(features);

  const {
    onekey_firmware_url: firmwareUrl,
    onekey_boot_url: bootUrl,
    onekey_ble_url: bleUrl,
  } = getReleaseUrl({
    features,
  });

  return {
    deviceType,
    serialNumber,
    bleVersion,
    bootloaderVersion,
    boardloaderVersion,
    firmwareVersion,
    bootloaderBuildId,
    boardloaderBuildId,
    firmwareBuildId,
    bleBuildId,
    bootUrl,
    firmwareUrl,
    bleUrl,
  };
}

export function getDeviceInfo(features: Features | undefined, onekeyFeatures: any | undefined) {
  if (!features) throw new Error('features is undefined');
  const _features = {
    ...features,
    ...onekeyFeatures,
  };
  console.error('caikaisheng _features', _features);
  const {
    deviceType,
    serialNumber,
    bleVersion,
    bootloaderVersion,
    boardloaderVersion,
    firmwareVersion,
  } = getDeviceBasicInfo(_features as Features);

  const { firmwareHash, bootloaderHash, boardloaderHash, bleHash } = getFirmwareInfoFromFeatures(
    _features as Features
  );

  const {
    se01Version,
    se01Hash,
    se02Version,
    se02Hash,
    se03Version,
    se03Hash,
    se04Version,
    se04Hash,
  } = getSeInfoFromFeatures(_features as Features);

  return {
    deviceType,
    serialNumber,
    boardloaderVersion,
    boardloaderHash,
    bootloaderVersion,
    bootloaderHash,
    se01Version,
    se01Hash,
    se02Version,
    se02Hash,
    se03Version,
    se03Hash,
    se04Version,
    se04Hash,
    firmwareVersion,
    firmwareHash,
    bleVersion,
    bleHash,
  };
}

export function getFeaturesBetweenProtocol(features: Features | undefined) {
  if (!features) return {};

  const hardwareInfo = getHardwareInfoFromFeatures(features);
  const firmwareInfo = getFirmwareInfoFromFeatures(features);
  const seInfo = getSeInfoFromFeatures(features);

  return {
    ...features,

    // Firmware info
    onekey_firmware_version: firmwareInfo.firmwareVersion,
    onekey_firmware_hash: firmwareInfo.firmwareHash,
    onekey_firmware_build_id: firmwareInfo.firmwareBuildId,

    onekey_boot_version: firmwareInfo.bootloaderVersion,
    onekey_boot_build_id: firmwareInfo.bootloaderBuildId,
    onekey_boot_hash: firmwareInfo.bootloaderHash,
    onekey_board_version: firmwareInfo.boardloaderVersion,
    onekey_board_build_id: firmwareInfo.boardloaderBuildId,
    onekey_board_hash: firmwareInfo.boardloaderHash,
    onekey_ble_version: firmwareInfo.bleVersion,
    onekey_ble_name: firmwareInfo.bleName,
    onekey_ble_build_id: firmwareInfo.bleBuildId,
    onekey_ble_hash: firmwareInfo.bleHash,
    bleMac: firmwareInfo.bleMac,

    // SE info
    onekey_se_type: seInfo.seType,
    onekey_se01_type: seInfo.se01Type,
    onekey_se02_type: seInfo.se02Type,
    onekey_se03_type: seInfo.se03Type,
    onekey_se04_type: seInfo.se04Type,
    onekey_se01_version: seInfo.se01Version,
    onekey_se02_version: seInfo.se02Version,
    onekey_se03_version: seInfo.se03Version,
    onekey_se04_version: seInfo.se04Version,
    onekey_se01_hash: seInfo.se01Hash,
    onekey_se02_hash: seInfo.se02Hash,
    onekey_se03_hash: seInfo.se03Hash,
    onekey_se04_hash: seInfo.se04Hash,
    onekey_se01_boot_version: seInfo.se01BootVersion,
    onekey_se02_boot_version: seInfo.se02BootVersion,
    onekey_se03_boot_version: seInfo.se03BootVersion,
    onekey_se04_boot_version: seInfo.se04BootVersion,
    onekey_se01_boot_hash: seInfo.se01BootHash,
    onekey_se02_boot_hash: seInfo.se02BootHash,
    onekey_se03_boot_hash: seInfo.se03BootHash,
    onekey_se04_boot_hash: seInfo.se04BootHash,
    onekey_se01_boot_build_id: seInfo.se01BootBuildId,
    onekey_se02_boot_build_id: seInfo.se02BootBuildId,
    onekey_se03_boot_build_id: seInfo.se03BootBuildId,
    onekey_se04_boot_build_id: seInfo.se04BootBuildId,
    onekey_se01_build_id: seInfo.se01BuildId,
    onekey_se02_build_id: seInfo.se02BuildId,
    onekey_se03_build_id: seInfo.se03BuildId,
    onekey_se04_build_id: seInfo.se04BuildId,
    onekey_se01_state: seInfo.se01State,
    onekey_se02_state: seInfo.se02State,
    onekey_se03_state: seInfo.se03State,
    onekey_se04_state: seInfo.se04State,

    // Hardware info
    device_id: hardwareInfo.serialNumber,
    label: hardwareInfo.label,
    onekey_device_type: hardwareInfo.deviceType,
    hardwareVersion: hardwareInfo.hardwareVersion,
    hardwareVersionRawAdc: hardwareInfo.hardwareVersionRawAdc,
    onekey_serial: hardwareInfo.serialNumber,
    onekey_serial_no: hardwareInfo.serialNumber,
    serial_no: hardwareInfo.serialNumber,
    init_state: hardwareInfo.init_state,
    language: hardwareInfo.language,
    passphrase_protection: hardwareInfo.passphrase_protection,
  };
}
