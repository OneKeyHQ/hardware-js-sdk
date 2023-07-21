import { EthereumGetPublicKeyOneKey, MessageResponse, TypedCall } from '@onekeyfe/hd-transport';
import { getEvmDefinitionParams } from './getEthereumDefinitions';
import { Device } from '../../../device/Device';

export default async function ({
  device,
  typedCall,
  param,
  supportTrezor,
}: {
  typedCall: TypedCall;
  param: EthereumGetPublicKeyOneKey;
  supportTrezor: boolean;
  device: Device;
}): Promise<MessageResponse<'EthereumPublicKey'> | MessageResponse<'EthereumPublicKeyOneKey'>> {
  if (supportTrezor) {
    let definitionParams: any | undefined;

    if (param.show_display) {
      definitionParams = await getEvmDefinitionParams({
        addressN: param.address_n,
        chainId: param.chain_id,
        device,
      });
    }

    return typedCall('EthereumGetPublicKey', 'EthereumPublicKey', {
      address_n: param.address_n,
      show_display: param.show_display,
      ...(definitionParams?.encoded_network && {
        encoded_network: definitionParams.encoded_network,
      }),
    });
  }

  return typedCall('EthereumGetPublicKeyOneKey', 'EthereumPublicKeyOneKey', {
    ...param,
  });
}
