import {
  HardwareErrorCode,
  TypedError,
  createDeviceNotSupportMethodError,
} from '@onekeyfe/hd-shared';

import { supportBatchPublicKey } from '../../utils/deviceFeaturesUtils';
import { isEqualBip44CoinType } from './pathUtils';
import { splitArray } from '../../utils/arrayUtils';
import { getDeviceType, getFirmwareType, shouldSkipMethodSupportCheck } from '../../utils';
import { DeviceModelToTypes } from '../../types';

import type { EcdsaPublicKeys, Path } from '@onekeyfe/hd-transport';
import type { Device } from '../../device/Device';

export async function batchGetPublickeys(
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

  const supportsBatchPublicKey =
    shouldSkipMethodSupportCheck(device.features, device.originalDescriptor?.protocolType) ||
    supportBatchPublicKey(device.features, options);
  if (!supportsBatchPublicKey) {
    throw createDeviceNotSupportMethodError('BatchGetPublickeys', getFirmwareType(device.features));
  }

  const existsPathNotEqualCoinType = paths.find(p => !isEqualBip44CoinType(p.address_n, coinType));
  if (options?.ignoreCoinType === false && existsPathNotEqualCoinType) {
    throw TypedError(HardwareErrorCode.ForbiddenKeyPath);
  }

  let batchSize = 10;
  const deviceType = getDeviceType(device.features);
  if (DeviceModelToTypes.model_mini.includes(deviceType)) {
    batchSize = 10;
  } else if (DeviceModelToTypes.model_touch.includes(deviceType)) {
    batchSize = 20;
  }

  const result: EcdsaPublicKeys = {
    public_keys: [],
    hd_nodes: [],
  };
  const splitPaths = splitArray(paths, batchSize);
  for (const paths of splitPaths) {
    const res = await device.commands.typedCall('BatchGetPublickeys', 'EcdsaPublicKeys', {
      paths,
      ecdsa_curve_name: ecdsaCurveName,
      include_node: options?.includeNode ?? false,
    });
    if (res.type !== 'EcdsaPublicKeys') {
      throw createDeviceNotSupportMethodError(
        'BatchGetPublickeys',
        getFirmwareType(device.features)
      );
    } else {
      result.root_fingerprint = res.message.root_fingerprint;
      result.public_keys.push(...res.message.public_keys);
      result.hd_nodes.push(...res.message.hd_nodes);
    }
  }
  if (result.hd_nodes.length !== paths.length && options?.includeNode) {
    throw TypedError(
      HardwareErrorCode.CallMethodError,
      'BatchGetPublickeys failed, hd_nodes length not match'
    );
  }
  if (result.public_keys.length !== paths.length && !options?.includeNode) {
    throw TypedError(
      HardwareErrorCode.CallMethodError,
      'BatchGetPublickeys failed, public_keys length not match'
    );
  }
  return result;
}
