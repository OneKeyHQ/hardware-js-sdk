import { ConfluxSignMessage as HardwareConfluxSignMessage } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';

export default class ConfluxSignMessage extends BaseMethod<HardwareConfluxSignMessage> {
  init() {
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
      message: formatAnyHex(messageHex),
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.4.0',
      },
    };
  }

  async run() {
    const res = await this.device.commands.typedCall(
      'ConfluxSignMessage',
      'ConfluxMessageSignature',
      {
        ...this.params,
      }
    );

    return Promise.resolve(res.message);
  }
}
