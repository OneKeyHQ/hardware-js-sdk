import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import { getCoinInfo } from './helpers/btcParamsUtils';
import {
  getBitcoinForkSupportedProtocols,
  getBitcoinForkVersionRange,
} from './helpers/versionLimit';

import type { VerifyMessage } from '@onekeyfe/hd-transport';

export default class BTCVerifyMessage extends BaseMethod<VerifyMessage> {
  getSupportedProtocols() {
    return getBitcoinForkSupportedProtocols([this.params?.coin_name]);
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

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

  getVersionRange() {
    return getBitcoinForkVersionRange([this.params.coin_name]);
  }

  async run() {
    const res = await this.device.commands.typedCall('VerifyMessage', 'Success', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
