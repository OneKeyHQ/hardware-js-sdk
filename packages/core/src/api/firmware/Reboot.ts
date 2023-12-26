import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { Reboot as HardwareReboot } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class Reboot extends BaseMethod<HardwareReboot> {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = {
      reboot_type: this.payload.reboot_type,
    };
  }

  async run() {
    return this.device.getCommands().typedCall('Reboot', 'Success', this.params);
  }
}
