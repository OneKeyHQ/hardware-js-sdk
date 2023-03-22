import { VerifyMessage } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';

import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import { getCoinInfo } from './helpers/btcParamsUtils';

export default class BTCVerifyMessage extends BaseMethod<VerifyMessage> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'address', type: 'string', required: true },
      { name: 'messageHex', type: 'hexString', required: true },
      { name: 'signature', type: 'hexString', required: true },
      { name: 'coin', type: 'string', required: true },
    ]);

    const { coin } = this.payload;
    const { address, messageHex, signature } = formatAnyHex(this.payload);

    const coinName = getCoinInfo(undefined, coin).name;

    this.params = {
      address,
      message: messageHex,
      signature,
      coin_name: coinName,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('VerifyMessage', 'Success', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
