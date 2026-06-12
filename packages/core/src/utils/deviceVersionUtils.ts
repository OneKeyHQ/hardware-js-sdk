import semver from 'semver';

import type { Features, IVersionArray } from '../types';

/**
 * Get Connected Device version by features
 */
export const getDeviceFirmwareVersion = (features: Features | undefined): IVersionArray => {
  if (!features) return [0, 0, 0];

  if (features.firmwareVersion && semver.valid(features.firmwareVersion)) {
    return features.firmwareVersion.split('.').map(Number) as IVersionArray;
  }

  return [0, 0, 0];
};

/**
 * Get Connected Device bluetooth firmware version by features
 */
export const getDeviceBLEFirmwareVersion = (features: Features): IVersionArray => {
  const bleVer = features?.bleVersion;

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
  if (features.bootloaderVersion && semver.valid(features.bootloaderVersion)) {
    return features.bootloaderVersion.split('.').map(Number) as IVersionArray;
  }

  return [0, 0, 0];
};

/**
 * Get Connected Device boardloader version by features
 */
export const getDeviceBoardloaderVersion = (features: Features): IVersionArray => {
  if (features?.boardVersion && semver.valid(features.boardVersion)) {
    return features.boardVersion.split('.').map(Number) as IVersionArray;
  }

  return [0, 0, 0];
};
