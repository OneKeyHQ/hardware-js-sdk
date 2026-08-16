import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import { validatePath } from '../helpers/pathUtils';
import { getCoinAndScriptType } from './helpers/btcParamsUtils';

import type { AuthorizeCoinJoin } from '@onekeyfe/hd-transport';

export default class BTCAuthorizeCoinJoin extends BaseMethod<AuthorizeCoinJoin> {
  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    const { path, coin } = this.payload;

    const addressN = validatePath(path);

    const { coinName, scriptType } = getCoinAndScriptType(addressN, coin, false);

    this.params = {
      address_n: addressN,
      coin_name: coinName,
      script_type: scriptType || 'SPENDADDRESS',
      coordinator: this.payload.coordinator,
      max_total_fee: this.payload.max_total_fee,
      fee_per_anonymity: this.payload.fee_per_anonymity,
      amount_unit: this.payload.amount_unit,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('AuthorizeCoinJoin', 'Success', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
