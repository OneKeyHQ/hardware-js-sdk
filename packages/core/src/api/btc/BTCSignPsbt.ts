import { SignPsbt } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';
import { getCoinInfo } from './helpers/btcParamsUtils';

export default class BTCSignPsbt extends BaseMethod<SignPsbt> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'psbt', type: 'hexString', required: true },
      { name: 'coin', type: 'string' },
    ]);

    const { psbt, coin } = this.payload;

    const coinInfo = getCoinInfo(undefined, coin);

    this.params = {
      psbt: formatAnyHex(psbt),
      coin_name: coinInfo.name,
    };
  }

  getVersionRange() {
    return {
      pro: {
        min: '4.9.3',
      },
    };
  }

  async run() {
    console.log('=====>>>>>::::PSBTTTTTTT');
    const res = await this.device.commands.typedCall('SignPsbt', 'SignedPsbt', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
