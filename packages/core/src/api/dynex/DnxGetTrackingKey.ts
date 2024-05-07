import type { DnxGetTrackingKey as HardwareDnxGetTrackingKey } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { serializedPath, validatePath } from '../helpers/pathUtils';
import { BaseMethod } from '../BaseMethod';
import { validateParams } from '../helpers/paramsValidator';

import type { DnxGetTrackingKeyParams, DnxTrackingKey } from '../../types';

export default class DnxGetTrackingKey extends BaseMethod<HardwareDnxGetTrackingKey> {
  init() {
    this.checkDeviceId = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.INITIALIZE];

    const payload = this.payload as DnxGetTrackingKeyParams;

    // check payload
    validateParams(payload, [{ name: 'path', required: true }]);

    // init params
    const addressN = validatePath(payload.path, 3);

    this.params = {
      address_n: addressN,
    };
  }

  getVersionRange() {
    return {
      classic: {
        min: '3.8.0',
      },
    };
  }

  async run(): Promise<DnxTrackingKey> {
    const res = await this.device.commands.typedCall('DnxGetTrackingKey', 'DnxTrackingKey', {
      ...this.params,
    });

    const { tracking_key } = res.message;

    return Promise.resolve({
      path: serializedPath(this.params.address_n),
      trackingKey: tracking_key,
    });
  }
}
