import { EthereumGetPublicKeyOneKey, MessageResponse, TypedCall } from '@onekeyfe/hd-transport';

export default async function ({
  typedCall,
  param,
}: {
  typedCall: TypedCall;
  param: EthereumGetPublicKeyOneKey;
}): Promise<MessageResponse<'EthereumPublicKey'>> {
  return typedCall('EthereumGetPublicKey', 'EthereumPublicKey', {
    address_n: param.address_n,
    show_display: param.show_display,
  });
}
