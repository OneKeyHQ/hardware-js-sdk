import { SignMessage } from '@onekeyfe/hd-transport/src/types/messages';
import { UI_REQUEST } from '../constants/ui-request';
import { validatePath } from './helpers/pathUtils';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { formatAnyHex } from './helpers/hexUtils';
import { getCoinAndScriptType } from './helpers/btcParamsUtils';

export default class BTCSignMessage extends BaseMethod<SignMessage> {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'messageHex', type: 'hexString', required: true },
      { name: 'coin', type: 'string' },
    ]);

    const { path, messageHex, coin } = this.payload;

    const address_n = validatePath(path);

    const { coin_name, script_type } = getCoinAndScriptType(address_n, coin, false);

    this.params = {
      address_n,
      message: formatAnyHex(messageHex),
      coin_name,
      script_type,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('SignMessage', 'MessageSignature', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
