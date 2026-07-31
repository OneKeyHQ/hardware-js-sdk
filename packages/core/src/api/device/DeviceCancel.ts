import { BaseMethod } from '../BaseMethod';

import type { Cancel } from '@onekeyfe/hd-transport';

export default class DeviceCancel extends BaseMethod<Cancel> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.useDevicePassphraseState = false;
    this.unlockPolicy = 'none';
  }

  async run() {
    const res = await this.device.commands.typedCall('Cancel', 'Success');

    return Promise.resolve(res.message);
  }
}
