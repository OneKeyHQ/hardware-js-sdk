import { TonGetAddress as HardwareTonGetAddress } from '@onekeyfe/hd-transport';

import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { TonAddress, TonGetAddressParams } from '../../types';

export default class TonGetAddress extends BaseMethod<HardwareTonGetAddress[]> {
  hasBundle = false;

  shouldConfirm = false;

  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    this.shouldConfirm = this.hasBundle
      ? this.payload.bundle.some((i: any) => !!i.showOnOneKey)
      : false;

    // check payload
    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    // init params
    this.params = [];
    payload.bundle.forEach((batch: TonGetAddressParams) => {
      const addressN = validatePath(batch.path, 3);

      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'showOnOneKey', type: 'boolean' },
        { name: 'walletVersion' },
        { name: 'isBounceable', type: 'boolean' },
        { name: 'isTestnetOnly', type: 'boolean' },
        { name: 'workchain' },
        { name: 'walletId', type: 'number' },
      ]);

      const showOnOneKey = batch.showOnOneKey ?? true;

      this.params.push({
        address_n: addressN,
        show_display: showOnOneKey,
        wallet_version: batch.walletVersion,
        is_bounceable: batch.isBounceable,
        is_testnet_only: batch.isTestnetOnly,
        workchain: batch.workchain,
        wallet_id: batch.walletId,
      });
    });
  }

  getVersionRange() {
    return {
      model_mini: {
        min: '3.0.0',
      },
      model_touch: {
        min: '4.3.0',
      },
    };
  }

  async run() {
    const responses: TonAddress[] = [];
    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('TonGetAddress', 'TonAddress', {
        ...param,
      });

      const { address, public_key } = res.message;

      const result = {
        path: serializedPath(param.address_n),
        publicKey: public_key,
        address,
      };
      responses.push(result);
      this.postPreviousAddressMessage(result);
    }

    validateResult(responses, ['address', 'publicKey'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
