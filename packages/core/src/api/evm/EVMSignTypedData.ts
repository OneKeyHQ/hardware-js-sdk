import semver from 'semver';
import {
  EthereumMessageSignature,
  EthereumTypedDataSignature,
  EthereumTypedDataStructAck,
  MessageKey,
} from '@onekeyfe/hd-transport/src/types/messages';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import { ERRORS } from '../../constants';
import { encodeData, getFieldType, parseArrayType } from '../helpers/typeNameUtils';
import {
  EthereumSignTypedDataMessage,
  EthereumSignTypedDataTypes,
} from '../../types/api/evmSignTypedData';
import { getDeviceFirmwareVersion, getDeviceType } from '../../utils/deviceFeaturesUtils';
import { TypedResponseMessage } from '../../device/DeviceCommands';

export type EVMSignTypedDataParams = {
  addressN: number[];
  metamaskV4Compat: boolean;
  data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>;
  domainHash?: string;
  messageHash?: string;
};

export default class EVMSignTypedData extends BaseMethod<EVMSignTypedDataParams> {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'metamaskV4Compat', type: 'boolean' },
      { name: 'data', type: 'object' },
      { name: 'domainHash', type: 'hexString' },
      { name: 'messageHash', type: 'hexString' },
    ]);

    const { path, data, metamaskV4Compat, domainHash, messageHash } = this.payload;

    const addressN = validatePath(path, 3);

    this.params = {
      addressN,
      metamaskV4Compat,
      data,
    };

    if (domainHash) {
      this.params.domainHash = formatAnyHex(domainHash);
      if (messageHash) {
        this.params.messageHash = formatAnyHex(messageHash);
      } else if (!!data && (!data.primaryType || data.primaryType !== 'EIP712Domain')) {
        throw ERRORS.TypedError(
          'Method_InvalidParameter',
          'message_hash should only be empty when data.primaryType=EIP712Domain'
        );
      }
    }
  }

  // async signTypedData() {
  //   const { commands } = this.device;
  //   const { addressN, data, metamaskV4Compat } = this.params;

  //   const {
  //     types,
  //     primaryType,
  //     domain,
  //     message,
  //   }: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = data;

  //   let response = await commands.typedCall(
  //     'EthereumSignTypedData',
  //     // 'EthereumTypedDataStructRequest|EthereumTypedDataValueRequest|EthereumTypedDataSignature',
  //     [
  //       'EthereumTypedDataStructRequest',
  //       'EthereumTypedDataValueRequest',
  //       'EthereumTypedDataSignature',
  //     ],
  //     {
  //       address_n: addressN,
  //       primary_type: primaryType as string,
  //       metamask_v4_compat: metamaskV4Compat,
  //     }
  //   );

  //   while (response.type === 'EthereumTypedDataStructRequest') {
  //     const { name: typeDefinitionName } = response.message;
  //     const typeDefinition = types[typeDefinitionName];
  //     if (typeDefinition === undefined) {
  //       throw ERRORS.TypedError(
  //         'Runtime',
  //         `Type ${typeDefinitionName} was not defined in types object`
  //       );
  //     }

  //     const dataStruckAck: EthereumTypedDataStructAck = {
  //       members: typeDefinition.map(({ name, type: typeName }) => ({
  //         name,
  //         type: getFieldType(typeName, types),
  //       })),
  //     };

  //     response = await commands.typedCall(
  //       'EthereumTypedDataStructAck',
  //       [
  //         'EthereumTypedDataStructRequest',
  //         'EthereumTypedDataValueRequest',
  //         'EthereumTypedDataSignature',
  //       ] as MessageKey[],
  //       dataStruckAck
  //     );
  //   }

  //   while (response.type === 'EthereumTypedDataValueRequest') {
  //     const { member_path } = response.message;

  //     let memberData;
  //     let memberTypeName: string;

  //     const [rootIndex, ...nestedMemberPath] = member_path;
  //     switch (rootIndex) {
  //       case 0:
  //         memberData = domain;
  //         memberTypeName = 'EIP712Domain';
  //         break;
  //       case 1:
  //         memberData = message;
  //         memberTypeName = primaryType as string;
  //         break;
  //       default:
  //         throw ERRORS.TypedError('Runtime', 'Root index can only be 0 or 1');
  //     }

  //     for (const index of nestedMemberPath) {
  //       if (Array.isArray(memberData)) {
  //         memberTypeName = parseArrayType(memberTypeName).entryTypeName;
  //         memberData = memberData[index];
  //       } else if (typeof memberData === 'object' && memberData !== null) {
  //         const memberTypeDefinition = types[memberTypeName][index];
  //         memberTypeName = memberTypeDefinition.type;
  //         memberData = memberData[memberTypeDefinition.name];
  //       } else {
  //         // TODO
  //       }
  //     }

  //     let encodedData;
  //     if (Array.isArray(memberData)) {
  //       // Sending the length as uint16
  //       encodedData = encodeData('uint16', memberData.length);
  //     } else {
  //       encodedData = encodeData(memberTypeName, memberData);
  //     }

  //     response = await commands.typedCall(
  //       'EthereumTypedDataValueAck',
  //       ['EthereumTypedDataValueRequest', 'EthereumTypedDataSignature'] as MessageKey[],
  //       {
  //         value: encodedData,
  //       }
  //     );
  //   }

  //   if (response.type !== 'EthereumTypedDataSignature') {
  //     throw ERRORS.TypedError('Runtime', 'Unexpected response type');
  //   }

  //   const { address, signature }: EthereumTypedDataSignature = response.message;
  //   return {
  //     address,
  //     signature,
  //   };
  // }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.1.9',
      },
    };
  }

  supportSignTyped() {
    const deviceType = getDeviceType(this.device.features);
    if (deviceType === 'classic' || deviceType === 'mini') {
      const currentVersion = getDeviceFirmwareVersion(this.device.features).join('.');
      const supportSignTypedVersion = '2.2.0';

      if (semver.lt(currentVersion, supportSignTypedVersion)) {
        return false;
      }
    }

    return true;
  }

  async run() {
    if (!this.device.features) {
      throw ERRORS.TypedError(
        'Device_InitializeFailed',
        'Device initialization failed. Please try again.'
      );
    }

    const { addressN } = this.params;

    // For Classic、Mini device we use EthereumSignTypedData
    const deviceType = getDeviceType(this.device.features);
    if (deviceType === 'classic' || deviceType === 'mini') {
      validateParams(this.params, [
        { name: 'domainHash', type: 'hexString', required: true },
        { name: 'messageHash', type: 'hexString', required: true },
      ]);

      const { domainHash, messageHash } = this.params;

      let response;
      if (this.supportSignTyped()) {
        response = await this.device.commands.typedCall(
          'EthereumSignTypedHash',
          'EthereumTypedDataSignature',
          {
            address_n: addressN,
            domain_separator_hash: domainHash ?? '',
            message_hash: messageHash,
          }
        );
      } else {
        response = await this.device.commands.typedCall(
          'EthereumSignMessageEIP712',
          'EthereumMessageSignature',
          {
            address_n: addressN,
            domain_hash: domainHash ?? '',
            message_hash: messageHash ?? '',
          }
        );
      }

      return Promise.resolve(response.message);
    }

    // For Touch、Pro we use EthereumSignTypedData
    // return this.signTypedData();
    return Promise.resolve(ERRORS.TypedError('Runtime', 'Not implemented'));
  }
}
