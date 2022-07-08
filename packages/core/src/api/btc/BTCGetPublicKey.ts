import { GetPublicKey } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { getScriptType, serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { BTCGetAddressParams } from '../../types/api/btcGetAddress';
import { getCoinInfo } from './helpers/btcParamsUtils';
import { BTCPublicKey } from '../../types/api/btcGetPublicKey';

export default class BTCGetPublicKey extends BaseMethod<GetPublicKey[]> {
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
        script_type: scriptType || 'SPENDADDRESS',
      });
    });
  }

  async run() {
    const responses: BTCPublicKey[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('GetPublicKey', 'PublicKey', {
        ...param,
      });

      responses.push({
        path: serializedPath(param.address_n),
        ...res.message,
      });
    }

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
