import { TezosSignTx as HardwareTezosSignTx } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';

export default class TezosSignTx extends BaseMethod<HardwareTezosSignTx> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    const { path, branch } = this.payload;

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
