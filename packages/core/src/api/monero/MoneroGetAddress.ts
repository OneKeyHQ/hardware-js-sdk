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

import type { MoneroGetAddress as HardwareMoneroGetAddress } from '@onekeyfe/hd-transport';
import type { MoneroAddress, MoneroGetAddressParams } from '../../types/api/moneroGetAddress';

export default class MoneroGetAddress extends BaseMethod<HardwareMoneroGetAddress[]> {
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
    payload.bundle.forEach((batch: MoneroGetAddressParams) => {
      validateParams(batch, [
        { name: 'path', required: true },
        { name: 'showOnOneKey', type: 'boolean' },
        { name: 'networkType', type: 'number' },
      ]);

      this.params.push({
        address_n: validateMoneroPath(batch.path),
        network_type: validateMoneroNetworkType(batch.networkType),
        show_display: batch.showOnOneKey ?? true,
      });
    });
  }

  getVersionRange() {
    return getMoneroVersionRange();
  }

  async run() {
    // Missing fields stay undefined so validateResult rejects them.
    const responses: Partial<MoneroAddress>[] = [];

    for (let i = 0; i < this.params.length; i++) {
      const param = this.params[i];

      const res = await this.device.commands.typedCall('MoneroGetAddress', 'MoneroAddress', {
        ...param,
      });

      const path = serializedPath(param.address_n);
      const address = decodeMoneroAddress(res.message.address);
      responses.push({ path, address });

      this.postPreviousAddressMessage({ address, path });
    }

    validateResult(responses, ['address'], {
      expectedLength: this.params.length,
    });

    return Promise.resolve(this.hasBundle ? responses : responses[0]);
  }
}
