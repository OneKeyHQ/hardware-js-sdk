import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import { validatePath } from '../helpers/pathUtils';
import { getCoinAndScriptType } from './helpers/btcParamsUtils';

import type { GetOwnershipId } from '@onekeyfe/hd-transport';

export default class BTCGetOwnershipId extends BaseMethod<GetOwnershipId> {
  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

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
