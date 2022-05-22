import { getInfo } from '@onekeyfe/rollout';
import { isNewer } from '@onekeyfe/rollout/lib/utils/version';
import { findDefectiveBatchDevice } from '../utils/findDefectiveBatchDevice';
import { getDeviceType } from '../utils/deviceFeaturesUtils';
import type { Features, FirmwareRelease, ReleaseInfo, DeviceFirmwareStatus } from '../types';

const releases: { [key: number | string]: FirmwareRelease[] } = {};
releases[1] = [];
releases[2] = [];
releases.mini = [];

const cleanUrl = (url?: string) => {
  if (typeof url !== 'string') return;
  if (url.indexOf('data/') === 0) return url.substring(5);
  return url;
};

export const parseFirmware = (json: any, model: number | string): void => {
  const obj = json;

  if (!json) return;
  Object.keys(obj).forEach(key => {
    const release = obj[key];
    releases[model].push({
      ...release,
      url: cleanUrl(release.url),
      url_bitcoinonly: cleanUrl(release.url_bitcoinonly),
    });
  });
};

export const getFirmwareStatus = (features: Features): DeviceFirmwareStatus => {
  // indication that firmware is not installed at all. This information is set to false in bl mode. Otherwise it is null.
  if (features.firmware_present === false) {
    return 'none';
  }
  // for t1 in bootloader, what device reports as firmware version is in fact bootloader version, so we can
  // not safely tell firmware version
  if (features.major_version === 1 && features.bootloader_mode) {
    return 'unknown';
  }

  // refuse to upgrade defective hardware
  if (findDefectiveBatchDevice(features)) {
    const { onekey_version } = features;
    let { major_version, minor_version, patch_version } = features;

    if (onekey_version) {
      const onekey_version_list = onekey_version.split('.').map(Number);
      [major_version, minor_version, patch_version] = onekey_version_list;
    }

    // @ts-expect-error
    const needUpdate = isNewer([2, 1, 6], [major_version, minor_version, patch_version]);
    return needUpdate ? 'required' : 'valid';
  }

  const deviceType = getDeviceType(features);
  const deviceSymbol = deviceType === 'mini' ? 'mini' : features.major_version;

  const info = getInfo({ features, releases: releases[deviceSymbol] });

  // should not happen, possibly if releases list contains inconsistent data or so
  if (!info) return 'unknown';

  if (info.isRequired) return 'required';

  if (info.isNewer) return 'outdated';

  return 'valid';
};

export const getRelease = (features: Features): ReleaseInfo => {
  const deviceType = getDeviceType(features);
  const deviceSymbol = deviceType === 'mini' ? 'mini' : features.major_version;
  return getInfo({ features, releases: releases[deviceSymbol] }) as ReleaseInfo;
};

export const getReleases = (model: number, features: Features): FirmwareRelease[] => {
  const deviceType = getDeviceType(features);
  const deviceSymbol = deviceType === 'mini' ? 'mini' : model;
  return releases[deviceSymbol];
};
