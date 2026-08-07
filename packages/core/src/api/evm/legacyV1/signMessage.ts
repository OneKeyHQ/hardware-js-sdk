import type {
  EthereumMessageSignature,
  EthereumSignMessageOneKey,
  TypedCall,
} from '@onekeyfe/hd-transport';

export default async function ({
  typedCall,
  params,
}: {
  typedCall: TypedCall;
  params: EthereumSignMessageOneKey;
}): Promise<EthereumMessageSignature> {
  // The generated legacy type omits chain_id, but old firmware accepts the OneKey
  // extension. A non-fresh object preserves that runtime field without a type cast.
  const message = {
    address_n: params.address_n,
    message: params.message,
    chain_id: params.chain_id,
  };
  const res = await typedCall('EthereumSignMessage', 'EthereumMessageSignature', message);

  return Promise.resolve(res.message);
}
