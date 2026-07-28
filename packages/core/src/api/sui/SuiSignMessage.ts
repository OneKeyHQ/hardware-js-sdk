import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { stripHexPrefix } from '../helpers/hexUtils';

import type { SuiSignMessage as HardwareSuiSignMessage } from '@onekeyfe/hd-transport';

export default class SuiSignMessage extends BaseMethod<HardwareSuiSignMessage> {
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
      model_mini: {
        min: '3.4.0',
      },
      model_touch: {
        min: '4.6.0',
      },
    };
  }

  async run() {
    const response = await this.device.commands.typedCall('SuiSignMessage', 'SuiMessageSignature', {
      ...this.params,
    });

    return Promise.resolve(response.message);
  }
}
