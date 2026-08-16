import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import { validatePath } from '../helpers/pathUtils';
import { getCoinAndScriptType } from './helpers/btcParamsUtils';

import type { GetOwnershipProof } from '@onekeyfe/hd-transport';

export default class BTCGetOwnershipProof extends BaseMethod<GetOwnershipProof> {
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
      user_confirmation: this.payload.user_confirmation,
      ownership_ids: this.payload.ownership_ids,
      commitment_data: this.payload.commitment_data,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('GetOwnershipProof', 'OwnershipProof', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
