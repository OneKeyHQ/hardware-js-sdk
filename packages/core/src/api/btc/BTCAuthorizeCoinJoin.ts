import { AuthorizeCoinJoin } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { getCoinAndScriptType } from './helpers/btcParamsUtils';

export default class BTCAuthorizeCoinJoin extends BaseMethod<AuthorizeCoinJoin> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

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
