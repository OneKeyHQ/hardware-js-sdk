import { BaseMethod } from '../BaseMethod';

export default class DeviceStatusGet extends BaseMethod {
  init() {
    this.requireProtocolV2 = true;
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const { message } = await this.device.commands.typedCall('DeviceStatusGet', 'DeviceStatus', {});
    return message;
  }
}
