import { DeviceBackToBoot, OneKeyRebootType } from '@onekeyfe/hd-transport';
import { UI_REQUEST } from '../../constants/ui-request';
import { FirmwareUpdateBaseMethod } from '../firmware/FirmwareUpdateBaseMethod';

// Upload hint Reboot BootLoader
export default class DeviceUpdateReboot extends FirmwareUpdateBaseMethod<DeviceBackToBoot> {
  init() {
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
    this.notAllowDeviceMode = [...this.notAllowDeviceMode, UI_REQUEST.BOOTLOADER];
  }

  async run() {
    const res = await this.reboot(OneKeyRebootType.BootLoader);

    return Promise.resolve(res.message);
  }
}
