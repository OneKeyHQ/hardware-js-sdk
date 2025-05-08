import semver from 'semver';
import { getFirmwareInfoFromFeatures } from '@onekeyfe/hd-shared';
import type { Features, IVersionArray } from '../types';

/**
 * Get Connected Device version by features
 */
export const getDeviceFirmwareVersion = (features: Features | undefined): IVersionArray => {
  if (!features) return [0, 0, 0];

  const { firmwareVersion } = getFirmwareInfoFromFeatures(features);
  if (semver.valid(firmwareVersion)) {
    return firmwareVersion?.split('.') as unknown as IVersionArray;
  }

  return [0, 0, 0];
};

/**
 * Get Connected Device bluetooth firmware version by features
 */
export const getDeviceBLEFirmwareVersion = (features: Features): IVersionArray => {
  const { bleVersion } = getFirmwareInfoFromFeatures(features);

  if (!bleVersion) {
    return [0, 0, 0];
  }

  if (!semver.valid(bleVersion)) {
    return [0, 0, 0];
  }

  return bleVersion.split('.') as unknown as IVersionArray;
};

/**
 * Get Connected Device bootloader version by features
 */
export const getDeviceBootloaderVersion = (features: Features | undefined): IVersionArray => {
  if (!features) return [0, 0, 0];
  const { bootloaderVersion } = getFirmwareInfoFromFeatures(features);
  if (semver.valid(bootloaderVersion)) {
    return bootloaderVersion?.split('.') as unknown as IVersionArray;
  }

  return [0, 0, 0];
};

/**
 * Get Connected Device boardloader version by features
 */
export const getDeviceBoardloaderVersion = (features: Features): IVersionArray => {
  const { boardloaderVersion } = getFirmwareInfoFromFeatures(features);
  if (semver.valid(boardloaderVersion)) {
    return boardloaderVersion?.split('.') as unknown as IVersionArray;
  }
  return [0, 0, 0];
};
