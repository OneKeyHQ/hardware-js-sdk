import { EthereumVerifyMessage } from '@onekeyfe/hd-transport/src/types/messages';
import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';

export default class EVMSignMessage extends BaseMethod<EthereumVerifyMessage> {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'address', type: 'string', required: true },
      { name: 'messageHex', type: 'hexString', required: true },
      { name: 'signature', type: 'hexString', required: true },
    ]);

    const { address, messageHex, signature } = formatAnyHex(this.payload);

    this.params = {
      address,
      message: messageHex,
      signature,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('EthereumVerifyMessage', 'Success', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
