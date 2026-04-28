import { UI_REQUEST } from '../../constants/ui-request';
import { validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';
import { formatAnyHex } from '../helpers/hexUtils';

import type { TonSignData as HardwareTonSignData } from '@onekeyfe/hd-transport';
import type { TonSignDataParams } from '../../types/api/tonSignData';

export default class TonSignData extends BaseMethod<HardwareTonSignData> {
  init() {
    this.strictCheckDeviceSupport = true;
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];

    validateParams(this.payload, [
      { name: 'path', required: true },
      { name: 'type', type: 'number', required: true },
      { name: 'payload', type: 'hexString', required: true },
      { name: 'schema', type: 'string' },
      { name: 'appdomain', type: 'string', required: true },
      { name: 'timestamp', required: true },
      { name: 'fromAddress', type: 'string' },
      { name: 'walletVersion' },
      { name: 'walletId', type: 'number' },
      { name: 'workchain' },
      { name: 'isBounceable', type: 'boolean' },
      { name: 'isTestnetOnly', type: 'boolean' },
    ]);

    const { path } = this.payload as TonSignDataParams;
    const addressN = validatePath(path, 3);

    this.params = {
      address_n: addressN,
      type: this.payload.type,
      payload: formatAnyHex(this.payload.payload),
      schema: this.payload.schema,
      appdomain: this.payload.appdomain,
      timestamp: this.payload.timestamp,
      from_address: this.payload.fromAddress,
      wallet_version: this.payload.walletVersion,
      wallet_id: this.payload.walletId,
      workchain: this.payload.workchain,
      is_bounceable: this.payload.isBounceable,
      is_testnet_only: this.payload.isTestnetOnly,
    };
  }

  // Required because strictCheckDeviceSupport=true above. Without an entry
  // here, BaseMethod returns an empty range and the core treats every
  // device as unsupported, blocking the call before run() ever fires.
  // Aligned with TonSignMessage's getFixInitStateErrorVersionRange() — bump
  // when the firmware release that ships TonSignData lands.
  getVersionRange() {
    return {
      model_touch: {
        min: '4.13.0',
      },
      model_classic1s: {
        min: '3.12.0',
      },
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('TonSignData', 'TonSignedData', {
      ...this.params,
    });

    return Promise.resolve(res.message);
  }
}
