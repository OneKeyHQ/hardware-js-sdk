import { createDeviceNotSupportMethodError } from '@onekeyfe/hd-shared';

import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import { getFirmwareType, shouldSkipMethodSupportCheck } from '../../utils';

import type { EthereumSignMessageEIP712 } from '@onekeyfe/hd-transport';

/**
 * @deprecated Use EVMSignTypedData instead.
 */
export default class EVMSignMessageEIP712 extends BaseMethod<EthereumSignMessageEIP712> {
  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'domainHash', type: 'hexString', required: true },
      { name: 'messageHash', type: 'hexString', required: true },
    ]);

    const { path, domainHash, messageHash } = this.payload;

    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      domain_hash: formatAnyHex(domainHash),
      message_hash: formatAnyHex(messageHash),
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.1.9',
      },
      model_classic1s: {
        min: '3.14.0',
      },
    };
  }

  async run() {
    if (
      shouldSkipMethodSupportCheck(
        this.device.features,
        this.device.originalDescriptor?.protocolType
      )
    ) {
      throw createDeviceNotSupportMethodError(this.name, getFirmwareType(this.device.features));
    }

    const res = await this.device.commands.typedCall(
      'EthereumSignMessageEIP712',
      'EthereumMessageSignature',
      {
        ...this.params,
      }
    );

    return Promise.resolve(res.message);
  }
}
