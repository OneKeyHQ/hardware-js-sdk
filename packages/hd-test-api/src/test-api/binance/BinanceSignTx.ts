import { CoreExtensionBaseMethod as BaseMethod, UI_REQUEST } from '@onekeyfe/hd-core';

import { validatePath } from '../helpers/pathUtils';

import type { BinanceSignTx as HardwareBinanceSignTx } from '@onekeyfe/hd-transport';

export default class BinanceSignTx extends BaseMethod<HardwareBinanceSignTx> {
  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    const { path } = this.payload;

    const addressN = validatePath(path, 3);

    // init params
    this.params = {
      address_n: addressN,
      msg_count: this.payload.msg_count,
      account_number: this.payload.account_number,
      chain_id: this.payload.chain_id,
      memo: this.payload.memo,
      sequence: this.payload.sequence,
      source: this.payload.source,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('BinanceSignTx', 'BinanceTxRequest', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
