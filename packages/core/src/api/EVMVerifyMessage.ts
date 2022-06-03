import { EthereumVerifyMessage } from '@onekeyfe/hd-transport/src/types/messages';
import { UI_REQUEST } from '../constants/ui-request';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { formatAnyHex } from './helpers/hexUtils';

export default class EVMSignMessage extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];
  }

  async run() {
    validateParams(this.payload, [
      { name: 'address', type: 'string', required: true },
      { name: 'messageHex', type: 'string', required: true },
      { name: 'signature', type: 'string', required: true },
    ]);

    const { address, messageHex, signature } = formatAnyHex(this.payload);

    const param: EthereumVerifyMessage = {
      address,
      message: messageHex,
      signature,
    };

    const res = await this.device.commands.typedCall('EthereumVerifyMessage', 'Success', {
      ...param,
    });

    return Promise.resolve(res.message);
  }
}
