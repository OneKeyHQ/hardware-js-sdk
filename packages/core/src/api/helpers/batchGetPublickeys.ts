import { Path } from '@onekeyfe/hd-transport';

import { TypedError, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { Device } from '../../device/Device';
import { supportBatchPublicKey } from '../../utils/deviceFeaturesUtils';
import { isEqualBip44CoinType } from './pathUtils';

export function batchGetPublickeys(
  device: Device,
  paths: Path[],
  ecdsaCurveName: string,
  coinType: number,
  options?: {
    includeNode?: boolean;
    ignoreCoinType?: boolean;
  }
) {
  const existsPathNotValid = paths.find(p => p.address_n.length < 3);
  if (existsPathNotValid) {
    throw TypedError(HardwareErrorCode.ForbiddenKeyPath, 'Path length must be greater than 3');
  }

  const supportsBatchPublicKey = supportBatchPublicKey(device.features, options);
  if (!supportsBatchPublicKey) {
    throw TypedError(HardwareErrorCode.DeviceNotSupportMethod);
  }

  const existsPathNotEqualCoinType = paths.find(p => !isEqualBip44CoinType(p.address_n, coinType));
  if (options?.ignoreCoinType === false && existsPathNotEqualCoinType) {
    throw TypedError(HardwareErrorCode.ForbiddenKeyPath);
  }

  return device.commands.typedCall('BatchGetPublickeys', 'EcdsaPublicKeys', {
    paths,
    ecdsa_curve_name: ecdsaCurveName,
    include_node: options?.includeNode ?? false,
  });
}
