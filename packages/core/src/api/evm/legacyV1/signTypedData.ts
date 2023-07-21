import {
  EthereumTypedDataSignature,
  EthereumTypedDataStructAck,
  TypedCall,
} from '@onekeyfe/hd-transport';
import { ERRORS } from '@onekeyfe/hd-shared';
import { EthereumSignTypedDataMessage, EthereumSignTypedDataTypes } from '../../../types';
import { encodeData, getFieldType, parseArrayType } from '../../helpers/typeNameUtils';

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
  const {
    types,
    primaryType,
    domain,
    message,
  }: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = data;

  let response = await typedCall(
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
      // @ts-ignore
      chain_id: chainId,
    }
  );

  while (response.type === 'EthereumTypedDataStructRequest') {
    // @ts-ignore
    const { name: typeDefinitionName } = response.message;
    const typeDefinition = types[typeDefinitionName];
    if (typeDefinition === undefined) {
      throw ERRORS.TypedError(
        'Runtime',
        `Type ${typeDefinitionName} was not defined in types object`
      );
    }

    const dataStruckAck: EthereumTypedDataStructAck = {
      members: typeDefinition.map(({ name, type: typeName }) => ({
        name,
        type: getFieldType(typeName, types),
      })),
    };

    response = await typedCall(
      'EthereumTypedDataStructAck',
      // @ts-ignore
      [
        'EthereumTypedDataStructRequest',
        'EthereumTypedDataValueRequest',
        'EthereumTypedDataSignature',
      ],
      dataStruckAck
    );
  }

  while (response.type === 'EthereumTypedDataValueRequest') {
    // @ts-ignore
    const { member_path } = response.message;

    let memberData;
    let memberTypeName: string;

    const [rootIndex, ...nestedMemberPath] = member_path;
    switch (rootIndex) {
      case 0:
        memberData = domain;
        memberTypeName = 'EIP712Domain';
        break;
      case 1:
        memberData = message;
        memberTypeName = primaryType as string;
        break;
      default:
        throw ERRORS.TypedError('Runtime', 'Root index can only be 0 or 1');
    }

    for (const index of nestedMemberPath) {
      if (Array.isArray(memberData)) {
        memberTypeName = parseArrayType(memberTypeName).entryTypeName;
        memberData = memberData[index];
      } else if (typeof memberData === 'object' && memberData !== null) {
        const memberTypeDefinition = types[memberTypeName][index];
        memberTypeName = memberTypeDefinition.type;
        memberData = memberData[memberTypeDefinition.name];
      } else {
        // TODO
      }
    }

    let encodedData;
    if (Array.isArray(memberData)) {
      // Sending the length as uint16
      encodedData = encodeData('uint16', memberData.length);
    } else {
      encodedData = encodeData(memberTypeName, memberData);
    }

    response = await typedCall(
      'EthereumTypedDataValueAck',
      // @ts-ignore
      ['EthereumTypedDataValueRequest', 'EthereumTypedDataSignature'],
      {
        value: encodedData,
      }
    );
  }

  if (response.type !== 'EthereumTypedDataSignature') {
    throw ERRORS.TypedError('Runtime', 'Unexpected response type');
  }

  // @ts-ignore
  const { address, signature }: EthereumTypedDataSignature = response.message;
  return {
    address,
    signature,
  };
};
