import semver from 'semver';
import { EDeviceType, ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';

import type { CoreExtensionDevice } from '@onekeyfe/hd-core';
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
  device: CoreExtensionDevice;
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
    const currentVersion = device.getCurrentFirmwareVersionString() ?? '0.0.0';
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

  const message = {
    address_n: addressN,
    domain_separator_hash: domainHash ?? '',
    message_hash: messageHash,
    chain_id: chainId,
  };
  return typedCall('EthereumSignTypedHash', 'EthereumTypedDataSignature', message);
};
