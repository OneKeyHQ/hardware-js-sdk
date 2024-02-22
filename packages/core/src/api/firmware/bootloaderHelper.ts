import semver from 'semver';

import { Features, IVersionArray } from '../../types';
import { getDeviceType } from '../../utils';

export function shouldUpdateBootloaderForClassicAndMini({
  currentVersion,
  bootloaderVersion,
  willUpdateFirmware,
  targetBootloaderVersion,
  bootloaderRelatedFirmwareVersion,
}: {
  currentVersion: string;
  bootloaderVersion: string;
  willUpdateFirmware: string;
  targetBootloaderVersion?: IVersionArray;
  bootloaderRelatedFirmwareVersion: IVersionArray;
}) {
  // If the current bootloader version is greater than or equal to the version that needs to be upgraded, then no upgrade is required
  if (targetBootloaderVersion && semver.gte(bootloaderVersion, targetBootloaderVersion.join('.'))) {
    return false;
  }

  if (semver.gte(willUpdateFirmware, bootloaderRelatedFirmwareVersion.join('.'))) {
    return true;
  }

  // The current version is greater than the relatedVersion and the bootloader version is lower than the target bootloader version
  if (semver.gte(currentVersion, bootloaderRelatedFirmwareVersion.join('.'))) {
    return true;
  }

  return false;
}

export function isEnteredManuallyBoot(features: Features, updateType: string) {
  const deviceType = getDeviceType(features);
  const isMini = deviceType === 'mini';
  const isBoot183ClassicUpBle =
    updateType === 'firmware' &&
    deviceType === 'classic' &&
    features.bootloader_version === '1.8.3';
  return isMini || isBoot183ClassicUpBle;
}
