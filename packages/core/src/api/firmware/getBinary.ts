import semver from 'semver';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { Features } from '../../types';
import { getDeviceType, httpRequest } from '../../utils';
import { DataManager } from '../../data-manager';

export interface GetInfoProps {
  features: Features;
  updateType: 'firmware' | 'ble';
}

interface GetBinaryProps extends GetInfoProps {
  version?: number[];
}

export const getBinary = async ({ features, updateType, version }: GetBinaryProps) => {
  const releaseInfo = getInfo({ features, updateType });

  if (!releaseInfo) {
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'no firmware found for this device');
  }

  if (version && !semver.eq(releaseInfo.version.join('.'), version.join('.'))) {
    throw ERRORS.TypedError(HardwareErrorCode.RuntimeError, 'firmware version mismatch');
  }

  // @ts-expect-error
  const url = updateType === 'ble' ? releaseInfo.webUpdate : releaseInfo.url;
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

const getInfo = ({ features, updateType }: GetInfoProps) => {
  const deviceType = getDeviceType(features);
  const { deviceMap } = DataManager;
  const releaseInfo = deviceMap?.[deviceType]?.[updateType]?.[0] ?? null;

  return releaseInfo;
};
