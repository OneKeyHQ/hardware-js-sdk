import { SignMessage } from '@onekeyfe/hd-transport/src/types/messages';
import { UI_REQUEST } from '../constants/ui-request';
import { validatePath } from './helpers/pathUtils';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { formatAnyHex } from './helpers/hexUtils';
import { getCoinAndScriptType } from './helpers/btcParamsUtils';

export default class BTCSignTransaction extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];
  }

  async run() {
    validateParams(this.payload, [
      { name: 'coin', type: 'string', required: true },
      { name: 'inputs', type: 'array', required: true },
      { name: 'outputs', type: 'array', required: true },
      { name: 'locktime', type: 'number' },
      { name: 'version', type: 'number' },
      { name: 'expiry', type: 'number' },
      { name: 'versionGroupId', type: 'number' },
      { name: 'overwintered', type: 'boolean' },
      { name: 'timestamp', type: 'number' },
      { name: 'branchId', type: 'number' },
    ]);

    const { path, messageHex, coin } = this.payload;

    const address_n = validatePath(path);

    const { coin_name, script_type } = getCoinAndScriptType(address_n, coin, false);

    const param: SignMessage = {
      address_n,
      message: formatAnyHex(messageHex),
      coin_name,
      script_type,
    };

    const res = await this.device.commands.typedCall('SignMessage', 'MessageSignature', {
      ...param,
    });

    return Promise.resolve(res.message);
  }
}
