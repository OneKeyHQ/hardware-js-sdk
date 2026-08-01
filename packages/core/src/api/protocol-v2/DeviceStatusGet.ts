import { BaseMethod } from '../BaseMethod';

export default class DeviceStatusGet extends BaseMethod {
  getSupportedProtocols() {
    return ['V2'] as const;
  }

  init() {
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
