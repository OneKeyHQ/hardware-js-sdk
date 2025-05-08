import semver from 'semver';
import { OneKeySeType } from '@onekeyfe/hd-transport';
import type { Features } from '@onekeyfe/hd-transport';
import { EDeviceType } from './deviceType';

export interface IHardwareInfo {
  deviceType: EDeviceType;
  hardwareVersion: string;
  hardwareVersionRawAdc: string;
  serialNumber: string;
  label: string;
  init_state: string;
  language: string;
  passphrase_protection: boolean;
}

export interface IFirmwareInfo {
  firmwareBuildId: string;
  firmwareHash: string;
  firmwareVersion: string;

  bootloaderBuildId: string;
  bootloaderHash: string;
  bootloaderVersion: string;

  boardloaderVersion: string;
  boardloaderBuildId: string;
  boardloaderHash: string;

  bleName: string;
  bleBuildId: string;
  bleHash: string;
  bleVersion: string;
  bleMac: string;
}

export interface ISeInfo {
  se01BuildId: string;
  se01Version: string;
  se01Hash: string;
  se01State: string;
  se01BootVersion: string;
  se01BootHash: string;
  se01BootBuildId: string;
  se02BuildId: string;
  se02Version: string;
  se02Hash: string;
  se02State: string;
  se02BootVersion: string;
  se02BootHash: string;
  se02BootBuildId: string;
  se03BuildId: string;
  se03Version: string;
  se03Hash: string;
  se03State: string;
  se03BootVersion: string;
  se03BootHash: string;
  se03BootBuildId: string;
  se04BuildId: string;
  se04Version: string;
  se04Hash: string;
  se04State: string;
  se04BootVersion: string;
  se04BootHash: string;
  se04BootBuildId: string;
  seType: OneKeySeType;
  se01Type: OneKeySeType;
  se02Type: OneKeySeType;
  se03Type: OneKeySeType;
  se04Type: OneKeySeType;
}

export const getFirmwareInfoFromFeatures = (features: Features | undefined): IFirmwareInfo => {
  const { ok_dev_info_resp: newInfo } = features || {};
  const oldFeatures = features as any;

  // Helper function to get bootloader version from old format
  const getOldBootloaderVersion = () => {
    // classic1s 3.5.0 pro 4.6.0
    if (semver.valid(oldFeatures?.onekey_boot_version)) {
      return oldFeatures?.onekey_boot_version.split('.');
    }

    if (!oldFeatures?.bootloader_version) {
      if (oldFeatures?.bootloader_mode) {
        return [
          oldFeatures?.major_version ?? 0,
          oldFeatures?.minor_version ?? 0,
          oldFeatures?.patch_version ?? 0,
        ];
      }
      return [0, 0, 0];
    }

    if (semver.valid(oldFeatures?.bootloader_version)) {
      return oldFeatures?.bootloader_version?.split('.');
    }

    return [0, 0, 0];
  };

  return {
    // Firmware
    firmwareBuildId: newInfo?.fw?.app?.build_id || oldFeatures?.onekey_firmware_build_id,
    firmwareHash: newInfo?.fw?.app?.hash || oldFeatures?.onekey_firmware_hash,
    firmwareVersion:
      newInfo?.fw?.app?.version ||
      oldFeatures?.onekey_firmware_version ||
      oldFeatures?.onekey_version,

    // Bootloader
    bootloaderBuildId: newInfo?.fw?.boot?.build_id || oldFeatures?.onekey_boot_build_id,
    bootloaderHash: newInfo?.fw?.boot?.hash || oldFeatures?.onekey_boot_hash,
    bootloaderVersion: newInfo?.fw?.boot?.version || getOldBootloaderVersion().join('.'),

    // Boardloader
    boardloaderBuildId: newInfo?.fw?.board?.build_id || oldFeatures?.onekey_board_build_id,
    boardloaderHash: newInfo?.fw?.board?.hash || oldFeatures?.onekey_board_hash,
    boardloaderVersion: newInfo?.fw?.board?.version || oldFeatures?.onekey_board_version,

    // BLE
    bleName: newInfo?.bt?.adv_name || oldFeatures?.onekey_ble_name,
    bleBuildId: newInfo?.bt?.app?.build_id || oldFeatures?.onekey_ble_build_id,
    bleHash: newInfo?.bt?.app?.hash || oldFeatures?.onekey_ble_hash,
    bleVersion:
      newInfo?.bt?.app?.version || oldFeatures?.onekey_ble_version || oldFeatures?.ble_ver,
    bleMac: newInfo?.bt?.mac || '',
  };
};

export const getHardwareInfoFromFeatures = (features: Features | undefined): IHardwareInfo => {
  const { ok_dev_info_resp: newInfo } = features || {};
  const oldFeatures = features as any;

  return {
    deviceType: (
      newInfo?.hw?.device_type ||
      oldFeatures?.onekey_device_type ||
      EDeviceType.Unknown
    ).toLowerCase(),
    hardwareVersion: newInfo?.hw?.hardware_version || '',
    hardwareVersionRawAdc:
      newInfo?.hw?.hardware_version_raw_adc || oldFeatures?.onekey_version_raw_adc,
    serialNumber:
      newInfo?.hw?.serial_no ||
      oldFeatures?.onekey_serial_no ||
      oldFeatures?.onekey_serial ||
      oldFeatures?.serial_no,
    label: newInfo?.status?.lable || oldFeatures?.label,
    init_state: newInfo?.status?.init_states || oldFeatures?.init_state,
    language: newInfo?.status?.language || oldFeatures?.language,
    passphrase_protection:
      newInfo?.status?.passphrase_protection || oldFeatures?.passphrase_protection || false,
  };
};

export const getSeInfoFromFeatures = (features: Features | undefined): ISeInfo => {
  const { ok_dev_info_resp: newInfo } = features || {};
  const oldFeatures = features as any;

  const getSingleSeInfo = (seNum: number) => {
    const seInfo = {
      1: newInfo?.se1,
      2: newInfo?.se2,
      3: newInfo?.se3,
      4: newInfo?.se4,
    }[seNum];

    const prefix = `se0${seNum}`;
    const oldPrefix = `onekey_se0${seNum}`;

    return {
      [`${prefix}BuildId`]: seInfo?.app?.build_id || oldFeatures?.[`${oldPrefix}_build_id`],
      [`${prefix}Version`]: seInfo?.app?.version || oldFeatures?.[`${oldPrefix}_version`],
      [`${prefix}Hash`]: seInfo?.app?.hash || oldFeatures?.[`${oldPrefix}_hash`],
      [`${prefix}State`]: seInfo?.state || oldFeatures?.[`${oldPrefix}_state`],
      [`${prefix}BootVersion`]: seInfo?.boot?.version || oldFeatures?.[`${oldPrefix}_boot_version`],
      [`${prefix}BootHash`]: seInfo?.boot?.hash || oldFeatures?.[`${oldPrefix}_boot_hash`],
      [`${prefix}BootBuildId`]:
        seInfo?.boot?.build_id || oldFeatures?.[`${oldPrefix}_boot_build_id`],
      [`${prefix}Type`]: seInfo?.type,
    };
  };

  // 合并所有SE信息
  const result = {
    ...getSingleSeInfo(1),
    ...getSingleSeInfo(2),
    ...getSingleSeInfo(3),
    ...getSingleSeInfo(4),
    seType: newInfo?.se1?.type || oldFeatures?.onekey_se_type,
  };

  return result as ISeInfo;
};
