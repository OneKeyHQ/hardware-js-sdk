import { BaseMethod } from '../BaseMethod';

export default class DeviceStatusGet extends BaseMethod {
  init() {
    this.requireProtocolV2 = true;
    this.unlockPolicy = 'none';
    this.useDevicePassphraseState = false;
    this.skipForceUpdateCheck = true;
  }

  async run() {
    const { message } = await this.device.commands.typedCall('DeviceStatusGet', 'DeviceStatus', {});
    this.device.updateProtocolV2Status(message);
    return message;
  }
}
