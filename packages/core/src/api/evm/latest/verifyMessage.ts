import { EthereumVerifyMessageOneKey, Success, TypedCall } from '@onekeyfe/hd-transport';

export default async function ({
  typedCall,
  params,
}: {
  typedCall: TypedCall;
  params: EthereumVerifyMessageOneKey;
}): Promise<Success> {
  const res = await typedCall('EthereumVerifyMessageOneKey', 'Success', {
    ...params,
  });

  return Promise.resolve(res.message);
}
