import { VerifyMessage } from '@onekeyfe/hd-transport/src/types/messages';
import { UI_REQUEST } from '../constants/ui-request';

import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { formatAnyHex } from './helpers/hexUtils';
import CoinManager from '../data-manager/CoinManager';

export default class BTCVerifyMessage extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];
  }

  async run() {
    validateParams(this.payload, [
      { name: 'address', type: 'string', required: true },
      { name: 'messageHex', type: 'hexString', required: true },
      { name: 'signature', type: 'hexString', required: true },
      { name: 'coin', type: 'string', required: true },
    ]);

    const { coin } = this.payload;
    const { address, messageHex, signature } = formatAnyHex(this.payload);

    const coin_name = CoinManager.getBitcoinCoinInfo({ name: coin })?.name;
    if (!coin_name) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Invalid coin name: ${coin}`);
    }

    const param: VerifyMessage = {
      address,
      message: messageHex,
      signature,
      coin_name,
    };

    const res = await this.device.commands.typedCall('VerifyMessage', 'Success', {
      ...param,
    });

    return Promise.resolve(res.message);
  }
}
