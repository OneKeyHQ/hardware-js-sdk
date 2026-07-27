import type {
  EthereumGetPublicKeyOneKey,
  MessageResponse,
  TypedCall,
} from '@onekeyfe/hd-transport';

export default async function ({
  typedCall,
  param,
}: {
  typedCall: TypedCall;
  param: EthereumGetPublicKeyOneKey;
}): Promise<MessageResponse<'EthereumPublicKey'>> {
  // The generated legacy type omits chain_id, but old firmware accepts the OneKey
  // extension. A non-fresh object preserves that runtime field without a type cast.
  const message = {
    address_n: param.address_n,
    show_display: param.show_display,
    chain_id: param.chain_id,
  };
  return typedCall('EthereumGetPublicKey', 'EthereumPublicKey', message);
}
