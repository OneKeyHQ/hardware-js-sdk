import { TonSignProof as HardwareTonSignProof } from '@onekeyfe/hd-transport';

import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { TonSignProofParams } from '../../types';

export default class TonSignProof extends BaseMethod<HardwareTonSignProof> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    // init params
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'appdomain', type: 'string' },
      { name: 'comment', type: 'string' },
      { name: 'expireAt', type: 'number' },
      { name: 'walletVersion' },
      { name: 'walletId', type: 'number' },
      { name: 'workchain' },
      { name: 'isBounceable', type: 'boolean' },
      { name: 'isTestnetOnly', type: 'boolean' },
    ]);

    const { path } = this.payload as TonSignProofParams;
    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      appdomain: this.payload.appdomain,
      comment: this.payload.comment,
      expire_at: this.payload.expireAt,
      wallet_version: this.payload.walletVersion,
      wallet_id: this.payload.walletId,
      workchain: this.payload.workchain,
      is_bounceable: this.payload.isBounceable,
      is_testnet_only: this.payload.isTestnetOnly,
    };
  }

  getVersionRange() {
    return {
      model_touch: {
        min: '4.10.0',
      },
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('TonSignProof', 'TonSignedProof', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
