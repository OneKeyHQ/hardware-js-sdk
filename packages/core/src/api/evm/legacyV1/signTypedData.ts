import type { TypedCall } from '@onekeyfe/hd-transport';
import type { EthereumSignTypedDataMessage, EthereumSignTypedDataTypes } from '../../../types';

export const signTypedData = async ({
  typedCall,
  addressN,
  data,
  metamaskV4Compat,
  chainId,
}: {
  typedCall: TypedCall;
  addressN: number[];
  data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>;
  metamaskV4Compat: boolean;
  chainId?: number;
}) => {
  const { primaryType }: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = data;

  // legacy EthereumSignTypedData 的生成类型没有 chain_id 字段，但旧固件按 OneKey 扩展
  // 接受该字段；通过预先声明的对象（非 fresh literal）携带额外字段，保持原有运行时行为。
  const message = {
    address_n: addressN,
    primary_type: primaryType as string,
    metamask_v4_compat: metamaskV4Compat,
    chain_id: chainId,
  };
  const response = await typedCall(
    'EthereumSignTypedData',
    [
      'EthereumTypedDataStructRequest',
      'EthereumTypedDataValueRequest',
      'EthereumTypedDataSignature',
      'EthereumGnosisSafeTxRequest',
    ],
    message
  );
  return response;
};
