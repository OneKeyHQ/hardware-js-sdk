import { Address, GetPublicKey } from '@onekeyfe/hd-transport/src/types/messages';
import { UI_REQUEST } from '../constants/ui-request';
import { getScriptType, validatePath } from './helpers/pathUtils';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { BTCGetAddressParams } from '../types/api/btcGetAddress';
import CoinManager from '../data-manager/CoinManager';

export default class BTCGetPublicKey extends BaseMethod {
  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];
  }

  async run() {
    const hasBundle = Object.prototype.hasOwnProperty.call(this.payload, 'bundle');
    const payload = hasBundle ? this.payload : { bundle: [this.payload] };

    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    const params: GetPublicKey[] = [];

    payload.bundle.forEach((batch: BTCGetAddressParams) => {
      const address_n = validatePath(batch.path, 1);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'coin', type: 'string' },
        { name: 'showOnOneKey', type: 'boolean' },
        { name: 'scriptType', type: 'string' },
      ]);

      const showOnOneKey = batch.showOnOneKey ?? false;

      const { multisig, coin } = batch;

      let script_type = batch.scriptType;
      if (!script_type) {
        script_type = getScriptType(address_n);
        if (script_type === 'SPENDMULTISIG' && !multisig) {
          script_type = 'SPENDADDRESS';
        }
      }

      let coin_name: string | undefined;
      if (coin) {
        coin_name = CoinManager.getBitcoinCoinInfo({ name: coin })?.name;
        if (!coin_name) {
          throw new Error(`Invalid coin name: ${coin}`);
        }
      } else {
        coin_name = CoinManager.getBitcoinCoinInfo({ path: address_n })?.name;
      }

      params.push({
        address_n,
        show_display: showOnOneKey,
        coin_name,
        script_type: script_type || 'SPENDADDRESS',
      });
    });

    const responses: Address[] = [];

    for (let i = 0; i < params.length; i++) {
      const param = params[i];

      const res = await this.device.commands.typedCall('GetPublicKey', 'PublicKey', {
        ...param,
      });

      responses.push(res.message);
    }

    return Promise.resolve(hasBundle ? responses : responses[0]);
  }
}
