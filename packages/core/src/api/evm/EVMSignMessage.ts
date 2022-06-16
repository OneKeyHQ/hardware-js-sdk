import { EthereumSignMessage } from '@onekeyfe/hd-transport/src/types/messages';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';

export default class EVMSignMessage extends BaseMethod<EthereumSignMessage> {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

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

  async run() {
    const res = await this.device.commands.typedCall(
      'EthereumSignMessage',
      'EthereumMessageSignature',
      {
        ...this.params,
      }
    );

    return Promise.resolve(res.message);
  }
}