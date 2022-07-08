import { StarcoinVerifyMessage as HardwareStarcoinVerifyMessage } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';

export default class EVMSignMessage extends BaseMethod<HardwareStarcoinVerifyMessage> {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'publicKey', type: 'string', required: true },
      { name: 'messageHex', type: 'hexString', required: true },
      { name: 'signature', type: 'hexString', required: true },
    ]);

    const { publicKey, messageHex, signature } = formatAnyHex(this.payload);

    this.params = {
      public_key: publicKey,
      message: messageHex,
      signature,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('StarcoinVerifyMessage', 'Success', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
