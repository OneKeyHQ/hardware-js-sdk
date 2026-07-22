import { BaseMethod } from '../BaseMethod';

export default class DeviceSettingsGet extends BaseMethod {
  init() {
    this.requireProtocolV2 = true;
    this.unlockPolicy = 'none';
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = undefined;
  }

  async run() {
    const res = await this.device.commands.typedCall('DeviceSettingsGet', 'DeviceSettings', {});
    return Promise.resolve(res.message);
  }
}
