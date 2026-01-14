import { BaseMethod } from '../BaseMethod';

import type { RebootToBootloader } from '@onekeyfe/hd-transport';

// Reboot BootLoader
export default class DeviceRebootToBootloader extends BaseMethod<RebootToBootloader> {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  getVersionRange() {
    return {
      classic: {
        min: '2.1.11',
      },
      mini: {
        min: '2.1.11',
      },
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('RebootToBootloader', 'Success');

    return Promise.resolve(res.message);
  }
}
