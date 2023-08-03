import { EthereumGetPublicKeyOneKey, MessageResponse, TypedCall } from '@onekeyfe/hd-transport';

export default async function ({
  typedCall,
  param,
}: {
  typedCall: TypedCall;
  param: EthereumGetPublicKeyOneKey;
}): Promise<MessageResponse<'EthereumPublicKeyOneKey'>> {
  return typedCall('EthereumGetPublicKeyOneKey', 'EthereumPublicKeyOneKey', {
    ...param,
  });
}
