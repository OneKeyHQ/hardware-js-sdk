import semver from 'semver';
import { get } from 'lodash';
import BigNumber from 'bignumber.js';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { Enum_Capability } from '@onekeyfe/hd-transport';

import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex, parseChainId, stripHexStartZeroes } from '../helpers/hexUtils';
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

import type {
  EthereumTypedDataSignature,
  EthereumTypedDataStructAck,
  MessageKey,
  MessageResponse,
  TypedCall,
} from '@onekeyfe/hd-transport';

export type EVMSignTypedDataParams = {
  addressN: number[];
  metamaskV4Compat: boolean;
  data: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>;
  domainHash?: string;
  messageHash?: string;
  chainId?: number;
};

const MINI_MAX_STRUCT_FIELDS = 16;
const MINI_MAX_ACCESS_PATH_DEPTH = 6;
const MINI_MAX_CUSTOM_DEP_STRUCTS = 8;
const MINI_MAX_NAME_LENGTH = 63;
const MINI_MAX_DYNAMIC_VALUE_BYTES = 1536;
const MINI_MAX_ARRAY_TYPE_FIELDS = 24;
const MINI_MAX_ARRAY_ELEMENTS = 24;

export default class EVMSignTypedData extends BaseMethod<EVMSignTypedDataParams> {
  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.allowUsePreInitialize = true;

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'metamaskV4Compat', type: 'boolean' },
      { name: 'data', type: 'object' },
      { name: 'domainHash', type: 'hexString' },
      { name: 'messageHash', type: 'hexString' },
      { name: 'chainId', type: 'number' },
      { name: 'usePreInitialize', type: 'boolean' },
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
          memberData = (memberData as Record<string, unknown>)[memberTypeDefinition.name];
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
    switch (TransportManager.getProtocolV1MessageSchema()) {
      case 'v1LegacySchema':
        supportTrezor = true;
        response = await signTypedDataLegacyV1({
          typedCall: this.device.commands.typedCall.bind(this.device.commands),
          addressN,
          data,
          metamaskV4Compat,
          chainId,
        });
        break;

      case 'v1CurrentSchema':
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

    switch (TransportManager.getProtocolV1MessageSchema()) {
      case 'v1LegacySchema':
        return signTypedHashLegacyV1({
          typedCall,
          addressN,
          domainHash,
          messageHash,
          chainId,
          device: this.device,
        });

      case 'v1CurrentSchema':
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

    const currentVersion = this.device.getCurrentFirmwareVersionString() ?? '0.0.0';
    const currentDeviceType = this.device.getCurrentDeviceType();
    const supportBiggerDataVersion = '4.4.0';

    const supportBiggerData =
      DeviceModelToTypes.model_classic1s.includes(currentDeviceType) ||
      (DeviceModelToTypes.model_touch.includes(currentDeviceType) &&
        semver.gte(currentVersion, supportBiggerDataVersion));

    if (supportBiggerData) {
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

  hasClassicFamilyTypedDataFormatViolations(
    item: EthereumSignTypedDataMessage<EthereumSignTypedDataTypes>
  ) {
    if (!item?.types || !item.primaryType) return false;

    const isArrayType = (typeName: string) => /\[[0-9]*\]$/.test(typeName);
    const isBytesType = (typeName: string) => /^bytes(\d*)$/.test(typeName);
    const isStructType = (typeName: string) => typeName in item.types;

    if (Object.values(item.types).some(fields => fields.length > MINI_MAX_STRUCT_FIELDS)) {
      return true;
    }

    if (
      Object.entries(item.types).some(
        ([typeName, fields]) =>
          typeName.length > MINI_MAX_NAME_LENGTH ||
          fields.some(field => field.name.length > MINI_MAX_NAME_LENGTH)
      )
    ) {
      return true;
    }

    const totalArrayTypeFields = Object.values(item.types).reduce(
      (count, fields) => count + fields.filter(field => isArrayType(field.type)).length,
      0
    );
    if (totalArrayTypeFields > MINI_MAX_ARRAY_TYPE_FIELDS) {
      return true;
    }

    const getDepth = (typeName: string, visiting: Set<string>): number => {
      if (isArrayType(typeName)) {
        const { entryTypeName } = parseArrayType(typeName);
        return 1 + getDepth(entryTypeName, visiting);
      }

      if (!isStructType(typeName)) return 1;

      // Cyclic reference detected — return a value that guarantees violation
      if (visiting.has(typeName)) return MINI_MAX_ACCESS_PATH_DEPTH + 1;

      visiting.add(typeName);
      const depth = item.types[typeName].reduce((maxDepth, { type }) => {
        const nextDepth = 1 + getDepth(type, visiting);
        return Math.max(maxDepth, nextDepth);
      }, 1);
      visiting.delete(typeName);
      return depth;
    };

    const maxPathDepth =
      1 +
      Math.max(
        getDepth('EIP712Domain', new Set()),
        getDepth(item.primaryType as string, new Set())
      );
    if (maxPathDepth > MINI_MAX_ACCESS_PATH_DEPTH) {
      return true;
    }

    const depStructs = new Set<string>();
    const collectDeps = (typeName: string, visiting: Set<string>) => {
      if (isArrayType(typeName)) {
        const { entryTypeName } = parseArrayType(typeName);
        collectDeps(entryTypeName, visiting);
        return;
      }

      if (!isStructType(typeName) || visiting.has(typeName)) return;

      visiting.add(typeName);
      if (typeName !== 'EIP712Domain' && typeName !== item.primaryType) {
        depStructs.add(typeName);
      }
      item.types[typeName].forEach(({ type }) => collectDeps(type, visiting));
      visiting.delete(typeName);
    };

    collectDeps('EIP712Domain', new Set());
    collectDeps(item.primaryType as string, new Set());
    if (depStructs.size > MINI_MAX_CUSTOM_DEP_STRUCTS) {
      return true;
    }

    const dynamicSize = (typeName: string, value: unknown) => {
      if (typeName === 'string') {
        return typeof value === 'string' ? Buffer.byteLength(value, 'utf8') : 0;
      }
      if (isBytesType(typeName) && typeof value === 'string') {
        const startIndex = value.startsWith('0x') ? 2 : 0;
        return (value.length - startIndex) / 2;
      }
      return 0;
    };

    const walkValue = (typeName: string, value: unknown): boolean => {
      if (value == null) return false;

      if (isArrayType(typeName)) {
        if (!Array.isArray(value)) return false;
        const { entryTypeName } = parseArrayType(typeName);
        const entryIsStruct = isStructType(entryTypeName);
        const entryIsPrimitive = !entryIsStruct && !isArrayType(entryTypeName);

        // In MetaMask V4, struct arrays are encoded individually and each element
        // occupies a slot, so large struct arrays hit firmware limits just like primitives.
        // In non-V4 mode struct arrays are hashed as a single blob, bypassing the limit.
        if (
          value.length > MINI_MAX_ARRAY_ELEMENTS &&
          (entryIsPrimitive || (this.params.metamaskV4Compat && entryIsStruct))
        ) {
          return true;
        }

        return value.some(entry => walkValue(entryTypeName, entry));
      }

      if (dynamicSize(typeName, value) > MINI_MAX_DYNAMIC_VALUE_BYTES) {
        return true;
      }

      if (typeof value === 'object' && isStructType(typeName)) {
        return item.types[typeName].some(({ name, type }) =>
          walkValue(type, (value as Record<string, unknown>)[name])
        );
      }

      return false;
    };

    return (
      walkValue('EIP712Domain', item.domain) || walkValue(item.primaryType as string, item.message)
    );
  }

  supportSignTyped() {
    const deviceType = this.device.getCurrentDeviceType();
    if (DeviceModelToTypes.model_mini.includes(deviceType)) {
      const currentVersion = this.device.getCurrentFirmwareVersionString() ?? '0.0.0';
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

    // For Classic / Mini:
    // - If parsed typed-data capability is missing, keep using blind-sign.
    // - For Mini with parsed capability, add extra format checks before parsed signing.
    const deviceType = this.device.getCurrentDeviceType();
    if (
      DeviceModelToTypes.model_mini.includes(deviceType) &&
      (!supportEip712OnClassic || this.hasClassicFamilyTypedDataFormatViolations(this.params.data))
    ) {
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
