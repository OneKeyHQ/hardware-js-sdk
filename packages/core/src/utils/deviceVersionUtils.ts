import semver from 'semver';
import type { Features, IVersionArray } from '../types';

/**
 * Get Connected Device version by features
 */
export const getDeviceFirmwareVersion = (features: Features | undefined): IVersionArray => {
  if (!features) return [0, 0, 0];

  if (semver.valid(features.onekey_firmware_version)) {
    return features.onekey_firmware_version?.split('.') as unknown as IVersionArray;
  }

  if (semver.valid(features.onekey_version)) {
    return features.onekey_version?.split('.') as unknown as IVersionArray;
  }

  return [0, 0, 0];
};

/**
 * Get Connected Device bluetooth firmware version by features
 */
export const getDeviceBLEFirmwareVersion = (features: Features): IVersionArray => {
  const bleVer = features?.onekey_ble_version || features?.ble_ver;

  if (!bleVer) {
    return [0, 0, 0];
  }

  if (!semver.valid(bleVer)) {
    return [0, 0, 0];
  }

  if (bleVer) {
    return bleVer.split('.').map(Number) as IVersionArray;
  }
  return [0, 0, 0];
};

/**
 * Get Connected Device bootloader version by features
 */
export const getDeviceBootloaderVersion = (features: Features | undefined): IVersionArray => {
  if (!features) return [0, 0, 0];

  // classic1s 3.5.0 pro 4.6.0
  if (semver.valid(features.onekey_boot_version)) {
    return features.onekey_boot_version?.split('.') as unknown as IVersionArray;
  }

  // low version hardware
  if (!features.bootloader_version) {
    if (features.bootloader_mode) {
      return [
        features?.major_version ?? 0,
        features?.minor_version ?? 0,
        features?.patch_version ?? 0,
      ];
    }
    return [0, 0, 0];
  }
  if (semver.valid(features.bootloader_version)) {
    return features.bootloader_version?.split('.') as unknown as IVersionArray;
  }
  return [0, 0, 0];
};

/**
 * Get Connected Device boardloader version by features
 */
export const getDeviceBoardloaderVersion = (features: Features): IVersionArray => {
  if (semver.valid(features?.onekey_board_version)) {
    return features?.onekey_board_version?.split('.') as unknown as IVersionArray;
  }

  return [0, 0, 0];
};
