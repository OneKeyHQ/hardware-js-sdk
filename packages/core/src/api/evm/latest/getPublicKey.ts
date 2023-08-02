import { EthereumGetPublicKeyOneKey, MessageResponse, TypedCall } from '@onekeyfe/hd-transport';

export default async function ({
  typedCall,
  param,
  supportTrezor,
}: {
  typedCall: TypedCall;
  param: EthereumGetPublicKeyOneKey;
  supportTrezor: boolean;
}): Promise<MessageResponse<'EthereumPublicKey'> | MessageResponse<'EthereumPublicKeyOneKey'>> {
  if (supportTrezor) {
    return typedCall('EthereumGetPublicKey', 'EthereumPublicKey', {
      address_n: param.address_n,
      show_display: param.show_display,
    });
  }

  return typedCall('EthereumGetPublicKeyOneKey', 'EthereumPublicKeyOneKey', {
    ...param,
  });
}
