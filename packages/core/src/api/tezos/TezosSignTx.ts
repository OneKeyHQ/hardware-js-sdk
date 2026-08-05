import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';

import type { TezosSignTx as HardwareTezosSignTx } from '@onekeyfe/hd-transport';

export default class TezosSignTx extends BaseMethod<HardwareTezosSignTx> {
  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    const { path } = this.payload;

    const addressN = validatePath(path, 3);

    // init params
    this.params = {
      address_n: addressN,
      branch: new Uint8Array(4),
      reveal: this.payload.reveal,
      transaction: this.payload.transaction,
      origination: this.payload.origination,
      delegation: this.payload.delegation,
      proposal: this.payload.proposal,
      ballot: this.payload.ballot,
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
    const res = await this.device.commands.typedCall('TezosSignTx', 'TezosSignedTx', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
