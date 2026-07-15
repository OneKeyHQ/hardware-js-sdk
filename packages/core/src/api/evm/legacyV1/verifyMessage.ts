import type { EthereumVerifyMessageOneKey, Success, TypedCall } from '@onekeyfe/hd-transport';

export default async function ({
  typedCall,
  params,
}: {
  typedCall: TypedCall;
  params: EthereumVerifyMessageOneKey;
}): Promise<Success> {
  // legacy EthereumVerifyMessage 的生成类型没有 chain_id 字段，但旧固件按 OneKey 扩展
  // 接受该字段；通过预先声明的对象（非 fresh literal）携带额外字段，保持原有运行时行为。
  const message = {
    signature: params.signature,
    message: params.message,
    address: params.address,
    chain_id: params.chain_id,
  };
  const res = await typedCall('EthereumVerifyMessage', 'Success', message);

  return Promise.resolve(res.message);
}
