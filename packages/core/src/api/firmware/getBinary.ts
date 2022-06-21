import semver from 'semver';
import { Features } from '../../types';
import { getDeviceType, httpRequest } from '../../utils';
import { DataManager } from '../../data-manager';
import { ERRORS } from '../../constants';

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
    throw ERRORS.TypedError('Runtime', 'no firmware found for this device');
  }

  if (
    version &&
    !semver.eq(releaseInfo.version as unknown as semver.SemVer, version as unknown as semver.SemVer)
  ) {
    throw ERRORS.TypedError('Runtime', 'firmware version mismatch');
  }

  const fw = await httpRequest(releaseInfo.url, 'binary');

  return fw;
};

const getInfo = ({ features, updateType }: GetInfoProps) => {
  const deviceType = getDeviceType(features);
  const { deviceMap } = DataManager;
  const releaseInfo = deviceMap?.[deviceType]?.[updateType]?.[0] ?? null;

  return releaseInfo;
};
