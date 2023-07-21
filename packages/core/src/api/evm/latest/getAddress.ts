import { EthereumGetAddressOneKey, MessageResponse, TypedCall } from '@onekeyfe/hd-transport';
import { Device } from '../../../device/Device';
import { getEvmDefinitionParams } from './getEthereumDefinitions';

export default async function ({
  device,
  typedCall,
  param,
  supportTrezor,
}: {
  device: Device;
  typedCall: TypedCall;
  param: EthereumGetAddressOneKey;
  supportTrezor: boolean;
}): Promise<MessageResponse<'EthereumAddress'> | MessageResponse<'EthereumAddressOneKey'>> {
  if (supportTrezor) {
    let definitionParams: any | undefined;

    if (param.show_display) {
      definitionParams = await getEvmDefinitionParams({
        addressN: param.address_n,
        chainId: param.chain_id,
        device,
      });
    }

    return typedCall('EthereumGetAddress', 'EthereumAddress', {
      address_n: param.address_n,
      show_display: param.show_display,
      ...(definitionParams?.encoded_network && {
        encoded_network: definitionParams.encoded_network,
      }),
    });
  }

  return typedCall('EthereumGetAddressOneKey', 'EthereumAddressOneKey', {
    ...param,
  });
}
