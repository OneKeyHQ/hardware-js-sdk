import { ERRORS, HardwareErrorCode } from '@onekeyfe/hd-shared';
import { FirmwareUpdateEmmc } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class FirmwareUpdateEmmcTest extends BaseMethod<FirmwareUpdateEmmc> {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.params = {
      path: this.payload.path,
      reboot_on_success: this.payload.reboot_on_success,
    };
  }

  async run() {
    return this.device.getCommands().typedCall('FirmwareUpdateEmmc', 'Success', this.params);
  }
}
