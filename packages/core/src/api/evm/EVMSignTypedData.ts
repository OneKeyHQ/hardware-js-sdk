import semver from 'semver';
import { get } from 'lodash';
import BigNumber from 'bignumber.js';
import { ERRORS, HardwareErrorCode, EDeviceType } from '@onekeyfe/hd-shared';
import {
  EthereumTypedDataSignature,
  EthereumTypedDataStructAck,
  MessageKey,
  MessageResponse,
  TypedCall,
  Enum_Capability,
} from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex, parseChainId, stripHexStartZeroes } from '../helpers/hexUtils';
import { getDeviceFirmwareVersion, getDeviceType } from '../../utils';
import { existCapability } from '../../utils/capabilitieUtils';
import {
  DeviceModelToTypes,
  type EthereumSignTypedDataMessage,
  type EthereumSignTypedDataTypes,
} from '../../types';
import TransportManager from '../../data-manager/TransportManager';
import { signTypedHash as signTypedHashLegacyV1 } from './legacyV1/signTypedHash';
import { signTypedHash } from './latest/signTypedHash';
import { signTypedData as signTypedDataLegacyV1 } from './legacyV1/signTypedData';
import { signTypedData } from './latest/signTypedData';
import { encodeData, getFieldType, parseArrayType } from '../helpers/typeNameUtils';

export type EVMSignTypedDataParams = {
  addressN: number[];
  metamaskV4Compat: boolean;
  data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>;
  domainHash?: string;
  messageHash?: string;
  chainId?: number;
};

export default class EVMSignTypedData extends BaseMethod<EVMSignTypedDataParams> {
  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'metamaskV4Compat', type: 'boolean' },
      { name: 'data', type: 'object' },
      { name: 'domainHash', type: 'hexString' },
      { name: 'messageHash', type: 'hexString' },
      { name: 'chainId', type: 'number' },
    ]);

    const { path, data, metamaskV4Compat, domainHash, messageHash, chainId } = this.payload;

    const addressN = validatePath(path, 3);

    this.params = {
      addressN,
      metamaskV4Compat,
      data,
      chainId,
    };

    if (domainHash) {
      this.params.domainHash = formatAnyHex(domainHash);
      if (messageHash) {
        this.params.messageHash = formatAnyHex(messageHash);
      } else if (!!data && (!data.primaryType || data.primaryType !== 'EIP712Domain')) {
        throw ERRORS.TypedError(
          HardwareErrorCode.CallMethodInvalidParameter,
          'message_hash should only be empty when data.primaryType=EIP712Domain'
        );
      }
    }
  }

  async handleSignTypedData({
    typedCall,
    signData,
    response,
    supportTrezor,
  }: {
    typedCall: TypedCall;
    signData: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>;
    response: MessageResponse<MessageKey>;
    supportTrezor: boolean;
  }) {
    const {
      types,
      primaryType,
      domain,
      message,
    }: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes> = signData;

    while (
      response.type === 'EthereumTypedDataStructRequest' ||
      response.type === 'EthereumTypedDataStructRequestOneKey'
    ) {
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

      if (supportTrezor) {
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
      } else {
        response = await typedCall(
          'EthereumTypedDataStructAckOneKey',
          // @ts-ignore
          [
            'EthereumTypedDataStructRequestOneKey',
            'EthereumTypedDataValueRequestOneKey',
            'EthereumTypedDataSignatureOneKey',
          ],
          dataStruckAck
        );
      }
    }

    while (
      response.type === 'EthereumTypedDataValueRequest' ||
      response.type === 'EthereumTypedDataValueRequestOneKey'
    ) {
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

      if (supportTrezor) {
        response = await typedCall(
          'EthereumTypedDataValueAck',
          // @ts-ignore
          ['EthereumTypedDataValueRequest', 'EthereumTypedDataSignature'],
          {
            value: encodedData,
          }
        );
      } else {
        response = await typedCall(
          'EthereumTypedDataValueAckOneKey',
          // @ts-ignore
          ['EthereumTypedDataValueRequestOneKey', 'EthereumTypedDataSignatureOneKey'],
          {
            value: encodedData,
          }
        );
      }
    }

    if (response.type === 'EthereumGnosisSafeTxRequest') {
      const { data } = this.params;
      const param = {
        to: data.message.to,
        value: formatAnyHex(new BigNumber(data.message.value).toString(16)),
        data: stripHexStartZeroes(formatAnyHex(data.message.data)),
        operation: parseInt(data.message.operation),
        safeTxGas: formatAnyHex(new BigNumber(data.message.safeTxGas).toString(16)),
        baseGas: formatAnyHex(new BigNumber(data.message.baseGas).toString(16)),
        gasPrice: formatAnyHex(new BigNumber(data.message.gasPrice).toString(16)),
        gasToken: data.message.gasToken,
        refundReceiver: data.message.refundReceiver,
        nonce: formatAnyHex(new BigNumber(data.message.nonce).toString(16)),
        chain_id: parseChainId(data.domain.chainId),
        verifyingContract: data.domain.verifyingContract,
      };
      response = await typedCall(
        'EthereumGnosisSafeTxAck',
        // @ts-ignore
        ['EthereumTypedDataSignature', 'EthereumTypedDataSignatureOneKey'],
        param
      );
    }

    if (
      response.type !== 'EthereumTypedDataSignature' &&
      response.type !== 'EthereumTypedDataSignatureOneKey'
    ) {
      throw ERRORS.TypedError('Runtime', 'Unexpected response type');
    }

    // @ts-ignore
    const { address, signature }: EthereumTypedDataSignature = response.message;
    return {
      address,
      signature,
    };
  }

  async signTypedData() {
    const { addressN, data, metamaskV4Compat, chainId } = this.params;

    let supportTrezor = false;
    let response: MessageResponse<MessageKey>;
    switch (TransportManager.getMessageVersion()) {
      case 'v1':
        supportTrezor = true;
        response = await signTypedDataLegacyV1({
          typedCall: this.device.commands.typedCall.bind(this.device.commands),
          addressN,
          data,
          metamaskV4Compat,
          chainId,
        });
        break;

      case 'latest':
      default:
        supportTrezor = false;
        response = await signTypedData({
          typedCall: this.device.commands.typedCall.bind(this.device.commands),
          addressN,
          data,
          metamaskV4Compat,
          chainId,
        });
        break;
    }

    return this.handleSignTypedData({
      typedCall: this.device.commands.typedCall.bind(this.device.commands),
      signData: data,
      response,
      supportTrezor,
    });
  }

  signTypedHash({
    typedCall,
    addressN,
    chainId,
    domainHash,
    messageHash,
  }: {
    typedCall: TypedCall;
    addressN: number[];
    chainId: number | undefined;
    domainHash: string | undefined;
    messageHash: string | undefined;
  }) {
    if (!domainHash) throw ERRORS.TypedError('Runtime', 'domainHash is required');

    switch (TransportManager.getMessageVersion()) {
      case 'v1':
        return signTypedHashLegacyV1({
          typedCall,
          addressN,
          domainHash,
          messageHash,
          chainId,
          device: this.device,
        });

      case 'latest':
      default:
        return signTypedHash({
          typedCall,
          addressN,
          domainHash,
          messageHash,
          chainId,
          device: this.device,
        });
    }
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.1.9',
      },
    };
  }

  hasBiggerData(item: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>) {
    const data = get(item.message, 'data', undefined) as string | undefined;
    if (!data) return false;

    let biggerLimit = 1024; // 1k

    const currentVersion = getDeviceFirmwareVersion(this.device.features).join('.');
    const supportBiggerDataVersion = '4.4.0';

    if (semver.gte(currentVersion, supportBiggerDataVersion)) {
      biggerLimit = 1536; // 1.5k
    }

    const startIndex = data.startsWith('0x') ? 2 : 0;
    return (data.length - startIndex) / 2 > biggerLimit;
  }

  hasNestedArrays(item: any): boolean {
    if (!item) return false;

    if (Array.isArray(item)) {
      // item is an array
      for (const element of item) {
        if (Array.isArray(element)) {
          // element is a nested array
          return true;
        }
        if (typeof element === 'object' && element !== null) {
          // element is an object, so check its properties recursively
          if (this.hasNestedArrays(element)) {
            return true;
          }
        }
      }
    } else if (typeof item === 'object' && item !== null) {
      // item is an object, so check its properties recursively
      // eslint-disable-next-line no-restricted-syntax
      for (const property in item) {
        if (this.hasNestedArrays(item[property])) {
          return true;
        }
      }
    }
    // no nested arrays found
    return false;
  }

  supportSignTyped() {
    const deviceType = getDeviceType(this.device.features);
    if (DeviceModelToTypes.model_mini.includes(deviceType)) {
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

    const { addressN, chainId } = this.params;

    // Classic1s / ClassicPure 3.14.0+, supported EthereumSignTypedDataOneKey
    const supportEip712OnClassic = existCapability(
      this.device.features,
      Enum_Capability.Capability_EthereumTypedData
    );

    // For Classic、Mini device we use EthereumSignTypedData
    const deviceType = getDeviceType(this.device.features);
    if (DeviceModelToTypes.model_mini.includes(deviceType) && !supportEip712OnClassic) {
      validateParams(this.params, [
        { name: 'domainHash', type: 'hexString', required: true },
        { name: 'messageHash', type: 'hexString', required: true },
      ]);

      const { domainHash, messageHash } = this.params;

      let response;
      if (this.supportSignTyped()) {
        response = await this.signTypedHash({
          typedCall: this.device.commands.typedCall.bind(this.device.commands),
          addressN,
          domainHash,
          messageHash,
          chainId,
        });
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

    // Touch Pro Sign NestedArrays
    if (this.hasNestedArrays(this.params.data) || this.hasBiggerData(this.params.data)) {
      validateParams(this.params, [
        { name: 'domainHash', type: 'hexString', required: true },
        { name: 'messageHash', type: 'hexString', required: true },
      ]);

      const { domainHash, messageHash } = this.params;

      if (!domainHash) throw ERRORS.TypedError('Runtime', 'domainHash is required');

      const response = await this.signTypedHash({
        typedCall: this.device.commands.typedCall.bind(this.device.commands),
        addressN,
        domainHash,
        messageHash,
        chainId,
      });

      return Promise.resolve(response.message);
    }

    // For Touch、Pro we use EthereumSignTypedData
    return this.signTypedData();
  }
}
