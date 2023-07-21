import semver from 'semver';
import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { TypedCall } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import { getDeviceFirmwareVersion, getDeviceType } from '../../utils/deviceFeaturesUtils';
import type { EthereumSignTypedDataMessage, EthereumSignTypedDataTypes } from '../../types';
import TransportManager from '../../data-manager/TransportManager';
import { signTypedHash as signTypedHashLegacyV1 } from './legacyV1/signTypedHash';
import { signTypedHash } from './latest/signTypedHash';
import { signTypedData as signTypedDataLegacyV1 } from './legacyV1/signTypedData';
import { signTypedData } from './latest/signTypedData';

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
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

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

  async signTypedData() {
    const { addressN, data, metamaskV4Compat, chainId } = this.params;

    switch (TransportManager.getMessageVersion()) {
      case 'v1':
        return signTypedDataLegacyV1({
          typedCall: this.device.commands.typedCall.bind(this.device.commands),
          addressN,
          data,
          metamaskV4Compat,
          chainId,
        });

      case 'latest':
      default:
        return signTypedData({
          typedCall: this.device.commands.typedCall.bind(this.device.commands),
          addressN,
          data,
          metamaskV4Compat,
          chainId,
          supportTrezor: this.supportTrezor,
          device: this.device,
        });
    }
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
    if (!chainId) throw ERRORS.TypedError('Runtime', 'chainId is required');

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
          supportTrezor: this.supportTrezor,
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

    const { addressN, chainId } = this.params;

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
    if (this.hasNestedArrays(this.params.data)) {
      validateParams(this.params, [
        { name: 'domainHash', type: 'hexString', required: true },
        { name: 'messageHash', type: 'hexString', required: true },
      ]);

      const { domainHash, messageHash } = this.params;

      if (!domainHash) throw ERRORS.TypedError('Runtime', 'domainHash is required');
      if (!chainId) throw ERRORS.TypedError('Runtime', 'chainId is required');

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
