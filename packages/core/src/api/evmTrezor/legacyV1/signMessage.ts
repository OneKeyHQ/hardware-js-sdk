import {
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
  const res = await typedCall('EthereumSignMessage', 'EthereumMessageSignature', {
    address_n: params.address_n,
    message: params.message,
  });

  return Promise.resolve(res.message);
}
