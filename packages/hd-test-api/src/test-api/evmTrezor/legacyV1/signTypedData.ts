import type { TypedCall } from '@onekeyfe/hd-transport';
import type { EthereumSignTypedDataMessage, EthereumSignTypedDataTypes } from '@onekeyfe/hd-core';

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
