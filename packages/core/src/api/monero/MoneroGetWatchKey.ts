import { BaseMethod } from '../BaseMethod';
import { serializedPath } from '../helpers/pathUtils';
import { validateParams, validateResult } from '../helpers/paramsValidator';
import { UI_REQUEST } from '../../constants/ui-request';
import {
  decodeMoneroAddress,
  getMoneroVersionRange,
  validateMoneroNetworkType,
  validateMoneroPath,
} from './helpers';

import type { MoneroGetWatchKey as HardwareMoneroGetWatchKey } from '@onekeyfe/hd-transport';
import type { MoneroGetWatchKeyParams, MoneroWatchKey } from '../../types/api/moneroGetWatchKey';

export default class MoneroGetWatchKey extends BaseMethod<HardwareMoneroGetWatchKey[]> {
  hasBundle = false;

  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.checkDeviceId = true;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.NOT_INITIALIZE];
    this.strictCheckDeviceSupport = true;

    this.hasBundle = !!this.payload?.bundle;
    const payload = this.hasBundle ? this.payload : { bundle: [this.payload] };

    validateParams(payload, [{ name: 'bundle', type: 'array' }]);

    this.params = [];
    payload.bundle.forEach((batch: MoneroGetWatchKeyParams) => {
      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'networkType', type: 'number' },
      ]);

      this.params.push({
        address_n: validateMoneroPath(batch.path),
        network_type: validateMoneroNetworkType(batch.networkType),
      });
    });
  }

  getVersionRange() {
    return getMoneroVersionRange();
  }

  async run() {
    // Missing fields stay undefined so validateResult rejects them.
    const responses: Partial<MoneroWatchKey>[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('MoneroGetWatchKey', 'MoneroWatchKey', {
        ...param,
      });

      responses.push({
        path: serializedPath(param.address_n),
        watchKey: res.message.watch_key,
        address: decodeMoneroAddress(res.message.address),
      });
    }

    validateResult(responses, ['watchKey', 'address'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
