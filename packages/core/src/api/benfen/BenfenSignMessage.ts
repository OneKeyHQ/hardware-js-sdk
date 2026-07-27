import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { stripHexPrefix } from '../helpers/hexUtils';

import type { BenfenSignMessage as HardwareBenfenSignMessage } from '@onekeyfe/hd-transport';
import type { DeviceFirmwareRange } from '../../types';

export default class BenfenSignMessage extends BaseMethod<HardwareBenfenSignMessage> {
  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.allowUsePreInitialize = true;

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'messageHex', type: 'hexString', required: true },
    ]);

    const { path, messageHex } = this.payload;
    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      message: stripHexPrefix(messageHex),
    };
  }

  getVersionRange(): DeviceFirmwareRange {
    return {
      pro2: {
        min: '0.0.0',
        unsupported: true,
      },
      pro: {
        min: '4.12.0',
      },
      model_classic1s: {
        min: '3.11.0',
      },
    };
  }

  async run() {
    const response = await this.device.commands.typedCall(
      'BenfenSignMessage',
      'BenfenMessageSignature',
      {
        ...this.params,
      }
    );

    return Promise.resolve(response.message);
  }
}
