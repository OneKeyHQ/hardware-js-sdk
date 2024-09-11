import { TonSignMessage as HardwareTonSignMessage } from '@onekeyfe/hd-transport';

import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { TonSignMessageParams } from '../../types';

export default class TonSignMessage extends BaseMethod<HardwareTonSignMessage> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    // init params
    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'destination', type: 'string' },
      { name: 'jettonMasterAddress', type: 'string' },
      { name: 'jettonWalletAddress', type: 'string' },
      { name: 'tonAmount', type: 'number' },
      { name: 'jettonAmount', type: 'number' },
      { name: 'fwdFee', type: 'number' },
      { name: 'comment', type: 'string' },
      { name: 'isRawData', type: 'boolean' },
      { name: 'mode', type: 'number' },
      { name: 'seqno', type: 'number' },
      { name: 'expireAt', type: 'number' },
      { name: 'walletVersion' },
      { name: 'walletId', type: 'number' },
      { name: 'workchain' },
      { name: 'isBounceable', type: 'boolean' },
      { name: 'isTestnetOnly', type: 'boolean' },
      { name: 'extDestination', type: 'array' },
      { name: 'extTonAmount', type: 'array' },
      { name: 'extPayload', type: 'array' },
    ]);

    const { path } = this.payload as TonSignMessageParams;
    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      destination: this.payload.destination,
      jetton_master_address: this.payload.jettonMasterAddress,
      jetton_wallet_address: this.payload.jettonWalletAddress,
      ton_amount: this.payload.tonAmount,
      jetton_amount: this.payload.jettonAmount,
      fwd_fee: this.payload.fwdFee,
      comment: this.payload.comment,
      mode: this.payload.mode,
      is_raw_data: this.payload.isRawData,
      seqno: this.payload.seqno,
      expire_at: this.payload.expireAt,
      wallet_version: this.payload.walletVersion,
      wallet_id: this.payload.walletId,
      workchain: this.payload.workchain,
      is_bounceable: this.payload.isBounceable,
      is_testnet_only: this.payload.isTestnetOnly,
      ext_destination: this.payload.extDestination,
      ext_ton_amount: this.payload.extTonAmount,
      ext_payload: this.payload.extPayload,
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
    const res = await this.device.commands.typedCall('TonSignMessage', 'TonSignedMessage', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
