import { EDeviceType } from '@onekeyfe/hd-shared';

import { BaseMethod } from '../BaseMethod';
import { getDeviceType } from '../../utils/deviceInfoUtils';

import type { RebootToBoardloaderParams } from '../../types/api/deviceRebootToBoardloader';

// Reboot BoardLoader
export default class DeviceRebootToBoardloader extends BaseMethod<RebootToBoardloaderParams> {
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
      const res = await (this.device.commands as any).call('Reboot', { reboot_type: 1 });
      return Promise.resolve(res.message);
    }

    // On Touch devices, messsage code 904 is RebootToBoardloader
    // so BininOutMessageSE message code 904 is used here
    const res = await this.device.commands.typedCall('BixinOutMessageSE', 'Success');
    return Promise.resolve(res.message);
  }
}
