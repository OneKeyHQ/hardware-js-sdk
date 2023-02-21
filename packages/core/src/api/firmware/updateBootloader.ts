import semver from 'semver';
import { Features } from '../../types';
import { getDeviceType } from '../../utils';
import {
  getDeviceBootloaderVersion,
  getDeviceFirmwareVersion,
} from '../../utils/deviceFeaturesUtils';

export function checkNeedUpdateBoot(features: Features) {
  const deviceType = getDeviceType(features);
  if (deviceType !== 'touch') return false;
  const currentVersion = getDeviceFirmwareVersion(features).join('.');
  const bootloaderVersion = getDeviceBootloaderVersion(features).join('.');
  return (
    semver.gte(currentVersion, '3.2.0') &&
    semver.gte(currentVersion, '4.1.0') &&
    semver.lte(bootloaderVersion, '2.4.0')
  );
}

function prepareUpdateBoot() {
  // TODO: get bootloader url
}
