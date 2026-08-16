import semver from 'semver';
import {
  EDeviceType,
  HardwareErrorCode,
  TypedError,
  createDeviceNotSupportMethodError,
} from '@onekeyfe/hd-shared';
import { DeviceModelToTypes } from '@onekeyfe/hd-core';

import { isEqualBip44CoinType } from './pathUtils';

import type { EcdsaPublicKeys, Path } from '@onekeyfe/hd-transport';
import type { CoreExtensionDevice } from '@onekeyfe/hd-core';

const splitArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

/**
 * Protocol-agnostic version of `supportBatchPublicKey` (utils/deviceFeaturesUtils):
 * derives device type and firmware version through Device accessors so that
 * Protocol V2 devices (features === undefined, profile set) resolve correctly.
 */
export function supportBatchPublicKeyByDevice(
  device: CoreExtensionDevice,
  options?: {
    includeNode?: boolean;
  }
): boolean {
  const currentVersion = device.getCurrentFirmwareVersionString() ?? '0.0.0';
  const deviceType = device.getCurrentDeviceType();

  // Pro2 has an independent version line and supports batch/include_node from its first
  // firmware version, so the Protocol V1 Pro 4.x threshold does not apply.
  if (device.isProtocolV2() || deviceType === EDeviceType.Pro2) {
    return true;
  }

  // btc batch get public key
  if (!!options?.includeNode && deviceType === EDeviceType.Pro) {
    return semver.gte(currentVersion, '4.14.0');
  }
  if (!!options?.includeNode && deviceType === EDeviceType.Touch) {
    return semver.gte(currentVersion, '4.11.0');
  }
  if (!!options?.includeNode && DeviceModelToTypes.model_classic1s.includes(deviceType)) {
    return semver.gte(currentVersion, '3.12.0');
  }
  if (!!options?.includeNode && DeviceModelToTypes.model_mini.includes(deviceType)) {
    return semver.gte(currentVersion, '3.10.0');
  }
  if (options?.includeNode) {
    return false;
  }

  // support batch get public key
  if (deviceType === EDeviceType.Touch || deviceType === EDeviceType.Pro) {
    return semver.gte(currentVersion, '3.1.0');
  }

  return semver.gte(currentVersion, '2.6.0');
}

export async function batchGetPublickeys(
  device: CoreExtensionDevice,
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

  const supportsBatchPublicKey = supportBatchPublicKeyByDevice(device, options);
  if (!supportsBatchPublicKey) {
    throw createDeviceNotSupportMethodError('BatchGetPublickeys', device.getCurrentFirmwareType());
  }

  const existsPathNotEqualCoinType = paths.find(p => !isEqualBip44CoinType(p.address_n, coinType));
  if (options?.ignoreCoinType === false && existsPathNotEqualCoinType) {
    throw TypedError(HardwareErrorCode.ForbiddenKeyPath);
  }

  let batchSize = 10;
  const deviceType = device.getCurrentDeviceType();
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
        device.getCurrentFirmwareType()
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
