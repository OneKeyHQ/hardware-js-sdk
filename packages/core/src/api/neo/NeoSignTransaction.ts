import { NeoSignTx } from '@onekeyfe/hd-transport';

import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';

export default class NeoSignTransaction extends BaseMethod<NeoSignTx> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'rawTx', type: 'hexString', required: true },
    ]);

    const { path, rawTx } = this.payload;
    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      raw_tx: formatAnyHex(rawTx),
    };
  }

  getVersionRange() {
    return {
      pro: {
        min: '4.12.0',
      },
      classic1s: {
        min: '3.11.0',
      },
    };
  }

  async run() {
    const typedCall = this.device.getCommands().typedCall.bind(this.device.getCommands());
    this.params = {
      address_n: this.params.address_n,
      raw_tx: this.params.raw_tx,
    };

    const res = await typedCall('NeoSignTx', ['NeoSignedTx'], {
      ...this.params,
    });

    return res.message;
  }
}
