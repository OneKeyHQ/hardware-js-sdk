import { MessageKey, MessageResponse, TypedCall } from '@onekeyfe/hd-transport';
import { EthereumSignTypedDataMessage, EthereumSignTypedDataTypes } from '../../../types';
import { getEvmDefinitionParams } from './getEthereumDefinitions';
import { Device } from '../../../device/Device';

export const signTypedData = async ({
  typedCall,
  addressN,
  data,
  metamaskV4Compat,
  chainId,
  supportTrezor,
  device,
}: {
  typedCall: TypedCall;
  addressN: number[];
  data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>;
  metamaskV4Compat: boolean;
  chainId?: number;
  supportTrezor: boolean;
  device: Device;
}) => {
  const { primaryType }: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = data;

  let response: MessageResponse<MessageKey>;
  if (supportTrezor) {
    const definitionParams = await getEvmDefinitionParams({
      addressN,
      chainId,
      device,
    });

    response = await typedCall(
      'EthereumSignTypedData',
      // @ts-ignore
      [
        'EthereumTypedDataStructRequest',
        'EthereumTypedDataValueRequest',
        'EthereumTypedDataSignature',
      ],
      {
        address_n: addressN,
        primary_type: primaryType as string,
        metamask_v4_compat: metamaskV4Compat,
        definitions: definitionParams,
      }
    );
  } else {
    response = await typedCall(
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
  }
  return response;
};
