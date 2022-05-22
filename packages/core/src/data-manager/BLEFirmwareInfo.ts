import { isNewer } from '@onekeyfe/rollout/lib/utils/version';
import type { DeviceFirmwareStatus, Features, ReleaseInfo } from '../types';
import { findDefectiveBatchDevice } from '../utils/findDefectiveBatchDevice';

const releases: ReleaseInfo[] = [];

export const parseBLEFirmware = (json: any): void => {
  if (!json) return;
  const obj = json;
  Object.keys(obj).forEach(key => {
    const release = obj[key];
    releases.push(release);
  });
};

const isRequired = (changelog: ReleaseInfo['changelog']) => {
  if (!changelog || !changelog.length) return null;
  return changelog.some(item => item.required);
};

function getInfo({ features, releases }: { features: Features; releases: ReleaseInfo[] }) {
  if (typeof features.ble_ver !== 'string') {
    return null;
  }

  const splitedVersion = features.ble_ver.split('.');

  if (splitedVersion.length !== 3) {
    return null;
  }
  /**
   * TODO: 之前版本蓝牙固件类型推断有误，需要根据数据结构完善蓝牙固件类型
   */
  // @ts-expect-error
  const parsedReleases = releases.map(r => ({ ...r, version: r.version.split('.') }));
  // @ts-expect-error
  const changelog = parsedReleases.filter(r => isNewer(r.version, splitedVersion));

  if (!parsedReleases.length) {
    // no new firmware
    return null;
  }

  return {
    changelog,
    release: parsedReleases[0],
    // @ts-expect-error
    isRequired: isRequired(changelog),
    // @ts-expect-error
    isNewer: isNewer(parsedReleases[0].version, splitedVersion),
  };
}

export const getBLEFirmwareStatus = (features: Features): DeviceFirmwareStatus => {
  // refuse to upgrade defective hardware
  if (findDefectiveBatchDevice(features)) {
    return 'valid';
  }

  // indication that firmware is not installed at all. This information is set to false in bl mode. Otherwise it is null.
  if (features.ble_enable === false) {
    return 'none';
  }

  // bootloader mode
  if (features.ble_enable !== true) {
    return 'unknown';
  }

  const info = getInfo({ features, releases });

  // should not happen, possibly if releases list contains inconsistent data or so
  if (!info) return 'unknown';

  if (info.isRequired) return 'required';

  if (info.isNewer) return 'outdated';

  return 'valid';
};

export const getBLERelease = (features: Features) => getInfo({ features, releases });

export const getBLEReleases = (): ReleaseInfo[] => releases;
