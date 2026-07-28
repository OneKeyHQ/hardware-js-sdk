import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { stripHexPrefix } from '../helpers/hexUtils';

import type { SolanaSignUnsafeMessage as HardwareSolSignUnsafeMessage } from '@onekeyfe/hd-transport';

export default class SolSignMessage extends BaseMethod<HardwareSolSignUnsafeMessage> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.allowUsePreInitialize = true;

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'messageHex', type: 'hexString', required: true },
    ]);

    const { path, messageHex } = this.payload;
    const addressN = validatePath(path, 3);

    // init params
    this.params = {
      address_n: addressN,
      message: stripHexPrefix(messageHex),
    };
  }

  getVersionRange() {
    return {
      pro2: {
        min: '0.0.0',
      },
      pro: {
        min: '4.12.0',
      },
      touch: {
        min: '4.10.0',
      },
      model_classic1s: {
        min: '3.11.0',
      },
      model_mini: {
        min: '3.10.0',
      },
    };
  }

  async run() {
    const response = await this.device.commands.typedCall(
      'SolanaSignUnsafeMessage',
      'SolanaMessageSignature',
      {
        ...this.params,
      }
    );

    return Promise.resolve({
      signature: response.message.signature,
      pub: response.message.public_key,
    });
  }
}
