import { createHash } from 'crypto';
import { FirmwareRelease, VersionArray } from '../../types';
import * as versionUtils from './versionUtils';

export const getScore = (device_id: string) => {
  const hash = createHash('sha256');
  hash.update(device_id);
  const output = parseInt(hash.digest('hex'), 16) / 2 ** 256;
  return Math.round(output * 100) / 100;
};

export const filterSafeListByBootloader = (
  releasesList: FirmwareRelease[],
  bootloaderVersion: VersionArray
) =>
  releasesList.filter(
    item =>
      (!item.min_bootloader_version ||
        versionUtils.isNewerOrEqual(bootloaderVersion, item.min_bootloader_version)) &&
      (!item.bootloader_version ||
        versionUtils.isNewerOrEqual(item.bootloader_version, bootloaderVersion))
  );

export const filterSafeListByFirmware = (
  releasesList: FirmwareRelease[],
  firmwareVersion: VersionArray
) =>
  releasesList.filter(item =>
    versionUtils.isNewerOrEqual(firmwareVersion, item.min_firmware_version)
  );
