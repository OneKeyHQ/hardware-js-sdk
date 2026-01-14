import { BaseMethod } from '../BaseMethod';

import type { DeviceBackToBoot } from '@onekeyfe/hd-transport';

// Upload hint Reboot BootLoader
export default class DeviceUpdateReboot extends BaseMethod<DeviceBackToBoot> {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const res = await this.device.commands.typedCall('DeviceBackToBoot', 'Success');

    return Promise.resolve(res.message);
  }
}
