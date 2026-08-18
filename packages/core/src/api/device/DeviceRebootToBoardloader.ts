import { DeviceRebootType, DeviceSessionPinType } from '@onekeyfe/hd-transport';

import { BaseMethod } from '../BaseMethod';

import type { RebootToBoardloaderParams } from '../../types/api/deviceRebootToBoardloader';

// Reboot BoardLoader
export default class DeviceRebootToBoardloader extends BaseMethod<RebootToBoardloaderParams> {
  getSupportedProtocols() {
    return ['V1', 'V2'] as const;
  }

  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.unlockPolicy = 'unlock-before-run';
    this.protocolV2PreUnlockPinType = DeviceSessionPinType.Any;
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
    // Protocol V2 submodule firmware uses DeviceReboot with reboot_type enum.
    if (this.device.isProtocolV2()) {
      const res = await this.device.commands.typedCall('DeviceReboot', 'Success', {
        reboot_type: DeviceRebootType.Romloader,
      });
      this.device.markProtocolV2Reboot(DeviceRebootType.Romloader);
      return Promise.resolve(res.message);
    }

    // On Touch devices, messsage code 904 is RebootToBoardloader
    // so BininOutMessageSE message code 904 is used here
    const res = await this.device.commands.typedCall('BixinOutMessageSE', 'Success');
    return Promise.resolve(res.message);
  }
}
