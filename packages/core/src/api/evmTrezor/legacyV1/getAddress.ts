import type { EthereumGetAddressOneKey, MessageResponse, TypedCall } from '@onekeyfe/hd-transport';

export default async function ({
  typedCall,
  param,
}: {
  typedCall: TypedCall;
  param: EthereumGetAddressOneKey;
}): Promise<MessageResponse<'EthereumAddress'>> {
  const message = {
    address_n: param.address_n,
    show_display: param.show_display,
    chain_id: param.chain_id,
  };
  return typedCall('EthereumGetAddress', 'EthereumAddress', message);
}
