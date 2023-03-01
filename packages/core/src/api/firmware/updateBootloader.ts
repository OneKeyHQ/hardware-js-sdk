import semver from 'semver';
import { Features } from '../../types';
import { getDeviceType } from '../../utils';
import {
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
} from '../../utils/deviceFeaturesUtils';
import { DataManager } from '../../data-manager';

export function checkNeedUpdateBoot(features: Features) {
  const deviceType = getDeviceType(features);
  if (deviceType !== 'touch') return false;
  const currentVersion = getDeviceFirmwareVersion(features).join('.');
  const bootloaderVersion = getDeviceBootloaderVersion(features).join('.');
  const targetBootloaderVersion = DataManager.getBootloaderTargetVersion(features);
  if (!targetBootloaderVersion) return false;

  return (
    // support ResourceUpdate version 3.2.0
    semver.gte(currentVersion, '3.2.0') &&
    // support update bootloader version 4.1.0
    semver.gte(currentVersion, '4.1.0') &&
    // target bootloader version
    semver.lte(bootloaderVersion, targetBootloaderVersion.join('.'))
  );
}
