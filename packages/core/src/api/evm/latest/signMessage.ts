import {
  EthereumMessageSignature,
  EthereumSignMessageOneKey,
  TypedCall,
} from '@onekeyfe/hd-transport';
import { getEvmDefinitionParams } from './getEthereumDefinitions';
import { Device } from '../../../device/Device';

export default async function ({
  typedCall,
  params,
  supportTrezor,
  device,
}: {
  typedCall: TypedCall;
  params: EthereumSignMessageOneKey;
  supportTrezor: boolean;
  device: Device;
}): Promise<EthereumMessageSignature> {
  let res;
  if (supportTrezor) {
    const definitionParams = await getEvmDefinitionParams({
      addressN: params.address_n,
      chainId: params.chain_id,
      device,
    });
    res = await typedCall('EthereumSignMessage', 'EthereumMessageSignature', {
      address_n: params.address_n,
      message: params.message,
      ...(definitionParams?.encoded_network && {
        encoded_network: definitionParams.encoded_network,
      }),
    });
  } else {
    res = await typedCall('EthereumSignMessageOneKey', 'EthereumMessageSignatureOneKey', {
      ...params,
    });
  }

  return Promise.resolve(res.message);
}
