import { EosSignTx as HardwareEosSignTx } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';

export default class EosSignTx extends BaseMethod<HardwareEosSignTx> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

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
