import { ScdoSignMessage as HardwareScdoSignMessage } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { stripHexPrefix } from '../helpers/hexUtils';

export default class ScdoSignMessage extends BaseMethod<HardwareScdoSignMessage> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

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
      model_touch: {
        min: '4.10.0',
      },
    };
  }

  async run() {
    const response = await this.device.commands.typedCall('ScdoSignMessage', 'ScdoSignedMessage', {
      ...this.params,
    });

    return Promise.resolve(response.message);
  }
}
