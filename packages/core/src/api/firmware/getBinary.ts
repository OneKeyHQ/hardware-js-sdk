import semver from 'semver';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { Features } from '../../types';
import { getDeviceType, httpRequest } from '../../utils';
import { DataManager } from '../../data-manager';
import { findLatestRelease } from '../../utils/release';
import { getFirmwareUpdateField } from '../../utils/deviceFeaturesUtils';

export interface GetInfoProps {
  features: Features;
  updateType: 'firmware' | 'ble';
  isUpdateBootloader?: boolean;
  targetVersion?: string;
}

interface GetBinaryProps extends GetInfoProps {
  version?: number[];
}

export const getBinary = async ({
  features,
  updateType,
  version,
  isUpdateBootloader,
}: GetBinaryProps) => {
  const releaseInfo = getInfo({ features, updateType, targetVersion: version?.join('.') });

  if (!releaseInfo) {
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'no firmware found for this device');
  }

  if (version && !semver.eq(releaseInfo.version.join('.'), version.join('.'))) {
    const touchWithoutVersion = getDeviceType(features) === 'touch' && !features.onekey_version;
    if (!touchWithoutVersion) {
      throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'firmware version mismatch');
    }
  }

  const url =
    // eslint-disable-next-line no-nested-ternary
    updateType === 'ble'
      ? // @ts-expect-error
        releaseInfo.webUpdate
      : isUpdateBootloader
      ? releaseInfo.bootloaderResource
      : releaseInfo.url;
  let fw;
  try {
    fw = await httpRequest(url, 'binary');
  } catch {
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Method_FirmwareUpdate_DownloadFailed');
  }

  return {
    ...releaseInfo,
    binary: fw,
  };
};

export const getSysResourceBinary = async (url: string) => {
  let fw;
  try {
    fw = await httpRequest(url, 'binary');
  } catch {
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'Method_FirmwareUpdate_DownloadFailed');
  }

  return {
    binary: fw,
  };
};

export const getInfo = ({ features, updateType, targetVersion }: GetInfoProps) => {
  const deviceType = getDeviceType(features);
  const { deviceMap } = DataManager;

  let firmwareUpdateField: 'firmware' | 'ble' | 'firmware-v2' | 'firmware-v3' =
    getFirmwareUpdateField(features, updateType);
  if (deviceType === 'touch' && targetVersion) {
    if (semver.eq(targetVersion, '4.0.0')) {
      firmwareUpdateField = 'firmware-v2';
    } else if (semver.gt(targetVersion, '4.0.0')) {
      firmwareUpdateField = 'firmware-v3';
    }
  }

  console.log('=====>>>getInfo: ', firmwareUpdateField);
  const releaseInfo = deviceMap?.[deviceType]?.[firmwareUpdateField] ?? [];
  return findLatestRelease(releaseInfo);
};
