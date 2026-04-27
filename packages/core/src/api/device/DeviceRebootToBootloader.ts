import { EDeviceType } from '@onekeyfe/hd-shared';

import { BaseMethod } from '../BaseMethod';
import { getDeviceType } from '../../utils/deviceInfoUtils';

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
    // Pro2 uses its own Reboot message with reboot_type enum
    if (getDeviceType(this.device.features) === EDeviceType.Pro2) {
      const res = await (this.device.commands as any).call('Reboot', { reboot_type: 2 });
      return Promise.resolve(res.message);
    }

    const res = await this.device.commands.typedCall('RebootToBootloader', 'Success');
    return Promise.resolve(res.message);
  }
}
