import { TypedCall } from '@onekeyfe/hd-transport';
import { EthereumSignTypedDataMessage, EthereumSignTypedDataTypes } from '../../../types';

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
  return typedCall(
    'EthereumSignTypedDataOneKey',
    // @ts-ignore
    [
      'EthereumTypedDataStructRequestOneKey',
      'EthereumTypedDataValueRequestOneKey',
      'EthereumTypedDataSignatureOneKey',
    ],
    {
      address_n: addressN,
      primary_type: primaryType as string,
      metamask_v4_compat: metamaskV4Compat,
      chain_id: chainId,
    }
  );
};
