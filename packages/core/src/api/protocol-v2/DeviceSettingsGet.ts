import { BaseMethod } from '../BaseMethod';
import { mapDeviceSettingsToState } from '../../device/DeviceStateMapper';

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
    this.device.updateState(mapDeviceSettingsToState(res.message), 'apply-settings');
    return Promise.resolve(res.message);
  }
}
