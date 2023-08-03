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
  const res = await typedCall('EthereumSignMessageOneKey', 'EthereumMessageSignatureOneKey', {
    ...params,
  });

  return Promise.resolve(res.message);
}
