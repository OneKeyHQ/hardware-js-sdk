import { SignMessage } from '@onekeyfe/hd-transport/src/types/messages';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
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

    const addressN = validatePath(path);

    const { coinName, scriptType } = getCoinAndScriptType(addressN, coin, false);

    this.params = {
      address_n: addressN,
      message: formatAnyHex(messageHex),
      coin_name: coinName,
      script_type: scriptType,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('SignMessage', 'MessageSignature', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
