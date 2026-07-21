import { BaseMethod } from '../BaseMethod';
import { normalizeDeviceSettingsToFeaturesPatch } from '../../device/DeviceSettingsState';

export default class DeviceSettingsGet extends BaseMethod {
  init() {
    this.requireProtocolV2 = true;
    this.unlockPolicy = 'retry-on-locked';
    this.skipForceUpdateCheck = true;
    this.useDevicePassphraseState = false;
    this.params = undefined;
  }

  async run() {
    const res = await this.device.commands.typedCall('DeviceSettingsGet', 'DeviceSettings', {});
    this.device.updateFeaturesPatch(
      normalizeDeviceSettingsToFeaturesPatch(res.message),
      'device-settings-get'
    );
    return Promise.resolve(res.message);
  }
}
