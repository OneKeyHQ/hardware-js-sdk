import type { EthereumGetAddressOneKey, MessageResponse, TypedCall } from '@onekeyfe/hd-transport';

export default async function ({
  typedCall,
  param,
}: {
  typedCall: TypedCall;
  param: EthereumGetAddressOneKey;
}): Promise<MessageResponse<'EthereumAddress'>> {
  // legacy EthereumGetAddress 的生成类型没有 chain_id 字段，但旧固件按 OneKey 扩展
  // 接受该字段；通过预先声明的对象（非 fresh literal）携带额外字段，保持原有运行时行为。
  const message = {
    address_n: param.address_n,
    show_display: param.show_display,
    chain_id: param.chain_id,
  };
  return typedCall('EthereumGetAddress', 'EthereumAddress', message);
}
