import { GetOwnershipId } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { getCoinAndScriptType } from './helpers/btcParamsUtils';

export default class BTCGetOwnershipId extends BaseMethod<GetOwnershipId> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    const { path, coin } = this.payload;

    const addressN = validatePath(path);

    const { coinName, scriptType } = getCoinAndScriptType(addressN, coin, false);

    this.params = {
      address_n: addressN,
      coin_name: coinName,
      multisig: this.payload.multisig,
      script_type: scriptType || 'SPENDADDRESS',
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('GetOwnershipId', 'OwnershipId', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
