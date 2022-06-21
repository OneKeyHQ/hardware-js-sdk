import { VersionArray } from '../../types';
import { httpRequest } from '../../utils';
import { GetInfoProps, getInfo } from './firmwareInfo';
import * as versionUtils from './versionUtils';

interface GetBinaryProps extends GetInfoProps {
  baseUrl: string;
  btcOnly?: boolean;
  version?: number[];
  intermediary?: boolean;
}

export const getBinary = async ({
  features,
  releases,
  baseUrl,
  version,
  btcOnly,
}: GetBinaryProps) => {
  const releaseByFirmware = releases.find(r =>
    versionUtils.isEqual(r.version, version as unknown as VersionArray)
  );
  const infoByBootloader = getInfo({ features, releases });

  if (!infoByBootloader || !releaseByFirmware) {
    throw new Error('no firmware found for this device');
  }

  if (btcOnly && !releaseByFirmware.url_bitcoinonly) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    throw new Error(`firmware version ${version} does not exist in btc only variant`);
  }

  // it is better to be defensive and not allow user update rather than let him wipe his seed
  // in case of improper update
  if (!versionUtils.isEqual(releaseByFirmware.version, infoByBootloader.release.version)) {
    throw new Error(
      'version provided as param does not match firmware version found by features in bootloader'
    );
  }

  const fw = await httpRequest(
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    `${baseUrl}/${btcOnly ? releaseByFirmware.url_bitcoinonly : releaseByFirmware.url}`,
    'binary'
  );

  return {
    ...infoByBootloader,
    binary: fw,
  };
};
