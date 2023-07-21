import { MessageResponse, TypedCall } from '@onekeyfe/hd-transport';
import semver from 'semver';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { Device } from '../../../device/Device';
import { getEvmDefinitionParams } from './getEthereumDefinitions';
import { getDeviceFirmwareVersion, getDeviceType } from '../../../utils/deviceFeaturesUtils';

export const signTypedHash = async ({
  typedCall,
  addressN,
  device,
  chainId,
  domainHash,
  messageHash,
  supportTrezor,
}: {
  typedCall: TypedCall;
  addressN: number[];
  device: Device;
  chainId: number;
  domainHash: string;
  messageHash: string | undefined;
  supportTrezor: boolean;
}): Promise<
  | MessageResponse<'EthereumTypedDataSignature'>
  | MessageResponse<'EthereumTypedDataSignatureOneKey'>
> => {
  const deviceType = getDeviceType(device.features);
  if (deviceType === 'touch' || deviceType === 'pro') {
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

  let response;
  if (supportTrezor) {
    const definitionParams = await getEvmDefinitionParams({
      addressN,
      chainId,
      device,
    });
    response = await typedCall('EthereumSignTypedHash', 'EthereumTypedDataSignature', {
      address_n: addressN,
      domain_separator_hash: domainHash ?? '',
      message_hash: messageHash,
      ...(definitionParams?.encoded_network && {
        encoded_network: definitionParams.encoded_network,
      }),
    });
  } else {
    response = await typedCall('EthereumSignTypedHashOneKey', 'EthereumTypedDataSignatureOneKey', {
      address_n: addressN,
      domain_separator_hash: domainHash ?? '',
      message_hash: messageHash,
      chain_id: chainId,
    });
  }

  return response;
};
