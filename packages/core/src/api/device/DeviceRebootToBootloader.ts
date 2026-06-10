import { DevRebootType } from '@onekeyfe/hd-transport';

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
    // Protocol V2 uses DevReboot with reboot_type enum.
    if (this.device.isProtocolV2()) {
      const res = await this.device.commands.typedCall('DevReboot', 'Success', {
        reboot_type: DevRebootType.Bootloader,
      });
      return Promise.resolve(res.message);
    }

    const res = await this.device.commands.typedCall('RebootToBootloader', 'Success');
    return Promise.resolve(res.message);
  }
}
