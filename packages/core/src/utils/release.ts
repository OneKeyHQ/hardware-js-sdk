import semver from 'semver';
import {
  IBLEFirmwareReleaseInfo,
  IDeviceFirmwareStatus,
  IFirmwareReleaseInfo,
  IVersionArray,
} from '../types';

export const getReleaseStatus = (
  releases: (IFirmwareReleaseInfo | IBLEFirmwareReleaseInfo)[],
  currentVersion: string
): IDeviceFirmwareStatus => {
  const newVersions = releases.filter(r => semver.gt(r.version.join('.'), currentVersion));
  if (newVersions.length === 0) {
    return 'valid';
  }
  if (newVersions.some(r => r.required)) {
    return 'required';
  }
  return 'outdated';
};

export const getReleaseChangelog = (
  releases: (IFirmwareReleaseInfo | IBLEFirmwareReleaseInfo)[],
  currentVersion: string
): IFirmwareReleaseInfo['changelog'][] => {
  const newVersions = releases.filter(r => semver.gt(r.version.join('.'), currentVersion));
  return newVersions.map(r => r.changelog);
};

export const findLatestRelease = <T extends { version: IVersionArray }>(
  releases: T[]
): T | undefined => {
  let leastRelease = releases[0];
  releases.forEach(release => {
    if (semver.gt(release.version.join('.'), leastRelease.version.join('.'))) {
      leastRelease = release;
    }
  });
  return leastRelease;
};
