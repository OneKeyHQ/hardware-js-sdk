import { DeviceInfoSettings as HardwareDeviceInfoSettings } from '@onekeyfe/hd-transport';
import { BaseMethod } from '../BaseMethod';

export default class DeviceInfoSettings extends BaseMethod<HardwareDeviceInfoSettings> {
  init() {
    this.useDevicePassphraseState = false;

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
