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

  // The generated legacy type omits chain_id, but old firmware accepts the OneKey
  // extension. A non-fresh object preserves that runtime field without a type cast.
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
