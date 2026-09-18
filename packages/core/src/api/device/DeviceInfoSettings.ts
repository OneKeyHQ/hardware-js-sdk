import { BaseMethod } from '../BaseMethod';
import { UI_REQUEST } from '../../constants/ui-request';

import type { DeviceInfoSettings as HardwareDeviceInfoSettings } from '@onekeyfe/hd-transport';

export default class DeviceInfoSettings extends BaseMethod<HardwareDeviceInfoSettings> {
  init() {
    this.useDevicePassphraseState = false;
    this.allowDeviceMode = [...this.allowDeviceMode, UI_REQUEST.BOOTLOADER];
    this.skipForceUpdateCheck = true;
    this.params = {
      serial_no: this.payload.serial_no,
      cpu_info: this.payload.cpu_info,
      pre_firmware: this.payload.pre_firmware,
    };
  }

  async run() {
    const res = await this.device.commands.typedCall('DeviceInfoSettings', 'Success', this.params);

    return Promise.resolve(res.message);
  }
}
