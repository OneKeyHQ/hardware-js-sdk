import type { EthereumVerifyMessageOneKey, Success, TypedCall } from '@onekeyfe/hd-transport';

export default async function ({
  typedCall,
  params,
}: {
  typedCall: TypedCall;
  params: EthereumVerifyMessageOneKey;
}): Promise<Success> {
  const message = {
    signature: params.signature,
    message: params.message,
    address: params.address,
    chain_id: params.chain_id,
  };
  const res = await typedCall('EthereumVerifyMessage', 'Success', message);

  return Promise.resolve(res.message);
}
