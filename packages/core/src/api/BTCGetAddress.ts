import { Address, GetAddress } from '@onekeyfe/hd-transport/src/types/messages';
import { UI_REQUEST } from '../constants/ui-request';
import { getScriptType, validatePath } from './helpers/pathUtils';
import { BaseMethod } from './BaseMethod';
import { validateParams } from './helpers/paramsValidator';
import { BTCGetAddressParams } from '../types/api/btcGetAddress';
import { getCoinInfo } from './helpers/btcParamsUtils';

export default class BTCGetAddress extends BaseMethod<GetAddress[]> {
  hasBundle = false;

  init() {
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.INITIALIZE];

    this.hasBundle = Object.prototype.hasOwnProperty.call(this.payload, 'bundle');
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    this.params = [];
    payload.bundle.forEach((batch: BTCGetAddressParams) => {
      const addressN = validatePath(batch.path, 1);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'coin', type: 'string' },
        { name: 'showOnOneKey', type: 'boolean' },
        { name: 'multisig', type: 'object' },
        { name: 'scriptType', type: 'string' },
      ]);

      const showOnOneKey = batch.showOnOneKey ?? true;

      const { multisig, coin } = batch;

      let { scriptType } = batch;
      if (!scriptType) {
        scriptType = getScriptType(addressN);
        if (scriptType === 'SPENDMULTISIG' && !multisig) {
          scriptType = 'SPENDADDRESS';
        }
      }

      const coinName = getCoinInfo(addressN, coin).name;

      this.params.push({
        address_n: addressN,
        show_display: showOnOneKey,
        coin_name: coinName,
        multisig,
        script_type: scriptType || 'SPENDADDRESS',
      });
    });
  }

  async run() {
    const responses: Address[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('GetAddress', 'Address', {
        ...param,
      });

      responses.push(res.message);
    }

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
