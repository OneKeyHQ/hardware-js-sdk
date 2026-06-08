import semver from 'semver';
import { EDeviceType, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import { getDeviceFirmwareVersion } from '../../../utils';

import type { Device } from '../../../device/Device';
import type { MessageResponse, TypedCall } from '@onekeyfe/hd-transport';

export const signTypedHash = async ({
  typedCall,
  addressN,
  device,
  chainId,
  domainHash,
  messageHash,
}: {
  typedCall: TypedCall;
  addressN: number[];
  device: Device;
  chainId: number | undefined;
  domainHash: string;
  messageHash: string | undefined;
}): Promise<
  | MessageResponse<'EthereumTypedDataSignature'>
  | MessageResponse<'EthereumTypedDataSignatureOneKey'>
> => {
  const deviceType = device.getCurrentDeviceType();
  if (deviceType === EDeviceType.Touch || deviceType === EDeviceType.Pro) {
    // Touch Pro Sign NestedArrays
    const currentVersion = getDeviceFirmwareVersion(device.features).join('.');
    const supportNestedArraysSignVersion = '4.2.0';

    // 4.2.0 is the first version that supports nested arrays in signTypedData
    if (semver.lt(currentVersion, supportNestedArraysSignVersion)) {
      throw ERRORS.TypedError(
        HardwareErrorCode.CallMethodNeedUpgradeFirmware,
        `Device firmware version is too low, please update to ${supportNestedArraysSignVersion}`,
        { current: currentVersion, require: supportNestedArraysSignVersion }
      );
    }
  }

  return typedCall('EthereumSignTypedHash', 'EthereumTypedDataSignature', {
    address_n: addressN,
    domain_separator_hash: domainHash ?? '',
    message_hash: messageHash,
    // @ts-ignore
    chain_id: chainId,
  });
};
