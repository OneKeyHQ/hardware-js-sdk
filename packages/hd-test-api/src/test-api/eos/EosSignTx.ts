import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import { validatePath } from '../helpers/pathUtils';

import type { EosSignTx as HardwareEosSignTx } from '@onekeyfe/hd-transport';

export default class EosSignTx extends BaseMethod<HardwareEosSignTx> {
  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    const { path } = this.payload;

    const addressN = validatePath(path, 3);

    // init params
    this.params = {
      address_n: addressN,
      chain_id: this.payload.chain_id,
      header: this.payload.header,
      num_actions: this.payload.num_actions,
    };
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '2.5.0',
      },
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('EosSignTx', 'EosTxActionRequest', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
