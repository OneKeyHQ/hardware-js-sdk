import { EthereumGetAddressOneKey, MessageResponse, TypedCall } from '@onekeyfe/hd-transport';

export default async function ({
  typedCall,
  param,
}: {
  typedCall: TypedCall;
  param: EthereumGetAddressOneKey;
}): Promise<MessageResponse<'EthereumAddressOneKey'>> {
  return typedCall('EthereumGetAddressOneKey', 'EthereumAddressOneKey', {
    ...param,
  });
}
