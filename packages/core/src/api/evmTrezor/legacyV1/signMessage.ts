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
  const message = {
    address_n: params.address_n,
    message: params.message,
    chain_id: params.chain_id,
  };
  const res = await typedCall('EthereumSignMessage', 'EthereumMessageSignature', message);

  return Promise.resolve(res.message);
}
