import { AlephiumSignMessage as HardwareAlephiumSignMessage } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { stripHexPrefix } from '../helpers/hexUtils';

export default class AlephiumSignMessage extends BaseMethod<HardwareAlephiumSignMessage> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    // check payload
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'messageHex', type: 'hexString', required: true },
      { name: 'messageType', type: 'string' },
    ]);

    const { path, messageHex, messageType } = this.payload;
    const addressN = validatePath(path, 3);

    // init params
    this.params = {
      address_n: addressN,
      message: stripHexPrefix(messageHex),
      message_type: messageType ?? 'alephium',
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '3.4.0',
      },
      model_touch: {
        min: '4.6.0',
      },
    };
  }

  async run() {
    const response = await this.device.commands.typedCall(
      'AlephiumSignMessage',
      'AlephiumMessageSignature',
      {
        ...this.params,
      }
    );

    return Promise.resolve(response.message);
  }
}
