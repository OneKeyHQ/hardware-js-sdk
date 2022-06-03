import { EthereumSignMessage } from '@onekeyfe/hd-transport/src/types/messages';
import { UI_REQUEST } from '../constants/ui-request';
import { validatePath } from './helpers/pathUtils';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { formatAnyHex } from './helpers/hexUtils';

export default class EVMSignMessage extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];
  }

  async run() {
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'messageHex', type: 'hexString', required: true },
    ]);

    const { path, messageHex } = this.payload;

    const address_n = validatePath(path, 3);

    const param: EthereumSignMessage = {
      address_n,
      message: formatAnyHex(messageHex),
    };

    const res = await this.device.commands.typedCall(
      'EthereumSignMessage',
      'EthereumMessageSignature',
      {
        ...param,
      }
    );

    return Promise.resolve(res.message);
  }
}
